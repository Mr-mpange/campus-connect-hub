import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const text = (formData.get("text") as string) || "";

    const parts = text.split("*");
    const level = parts.length;

    // Helper to log and respond
    const logAndRespond = async (
      message: string,
      opts: { studentId?: string; userId?: string; menu?: string; ended?: boolean } = {}
    ) => {
      await serviceClient.from("ussd_sessions").insert({
        session_id: sessionId,
        phone_number: phoneNumber,
        student_id: opts.studentId || null,
        user_id: opts.userId || null,
        menu_selection: opts.menu || null,
        request_text: text,
        response_text: message.replace(/^(CON |END )/, ""),
        session_ended: opts.ended || message.startsWith("END "),
      });
      return new Response(message, { headers: { "Content-Type": "text/plain" } });
    };

    // Level 0: Welcome
    if (text === "") {
      return await logAndRespond("CON Welcome to the Student Portal.\nEnter your Student ID:");
    }

    const studentIdInput = parts[0];

    // Level 1: Ask for PIN
    if (level === 1) {
      return await logAndRespond("CON Enter your 4-digit USSD PIN:", { studentId: studentIdInput });
    }

    const pinInput = parts[1];

    // Authenticate
    const { data: profile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("user_id, full_name, student_id, department_id, ussd_pin")
      .eq("student_id", studentIdInput)
      .maybeSingle();

    if (profileErr || !profile) {
      return await logAndRespond("END Student ID not found. Please check and try again.", {
        studentId: studentIdInput,
      });
    }

    if (!profile.ussd_pin) {
      return await logAndRespond(
        "END USSD PIN not set. Please set your PIN in the web portal under Settings.",
        { studentId: studentIdInput, userId: profile.user_id }
      );
    }

    if (profile.ussd_pin !== pinInput) {
      return await logAndRespond("END Incorrect PIN. Please try again.", {
        studentId: studentIdInput,
        userId: profile.user_id,
      });
    }

    const userId = profile.user_id;
    const logOpts = { studentId: studentIdInput, userId };

    // Level 2: Main menu
    if (level === 2) {
      return await logAndRespond(
        `CON Welcome ${profile.full_name}!\n1. Check Results\n2. Payment Status\n3. Registered Courses\n4. Notices\n5. Change PIN\n0. Exit`,
        { ...logOpts, menu: "main_menu" }
      );
    }

    const menuChoice = parts[2];

    // ── 1. CHECK RESULTS ──
    if (menuChoice === "1") {
      if (level === 3) {
        return await logAndRespond("CON Enter Academic Session (e.g. 2024/2025):", {
          ...logOpts,
          menu: "results",
        });
      }

      const session = parts[3];
      const { data: results } = await serviceClient
        .from("results")
        .select("grade, score, courses:course_id(code, title, credit_units)")
        .eq("student_id", userId)
        .eq("academic_session", session)
        .in("status", ["approved", "published"]);

      if (!results || results.length === 0) {
        return await logAndRespond(`END No published results found for session ${session}.`, {
          ...logOpts,
          menu: "results",
        });
      }

      let msg = `Results for ${session}:\n`;
      let totalPoints = 0,
        totalCredits = 0;
      const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

      for (const r of results) {
        const c = r.courses as any;
        msg += `${c?.code}: ${r.grade || "N/A"} (${r.score || "-"})\n`;
        if (r.grade && gradePoints[r.grade] !== undefined) {
          totalPoints += gradePoints[r.grade] * (c?.credit_units || 0);
          totalCredits += c?.credit_units || 0;
        }
      }

      const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "N/A";
      msg += `\nGPA: ${gpa}`;
      return await logAndRespond(`END ${msg}`, { ...logOpts, menu: "results", ended: true });
    }

    // ── 2. PAYMENT STATUS ──
    if (menuChoice === "2") {
      const { data: payments } = await serviceClient
        .from("payments")
        .select("control_number, payment_type, amount, status")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!payments || payments.length === 0) {
        return await logAndRespond("END No payments found.", { ...logOpts, menu: "payments" });
      }

      const typeLabels: Record<string, string> = {
        tuition: "Tuition",
        exam: "Exam",
        registration: "Reg",
        retake: "Retake",
      };
      let msg = "Recent Payments:\n";
      for (const p of payments) {
        const type = typeLabels[p.payment_type] || p.payment_type;
        const status = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        msg += `${type}: TZS ${Number(p.amount).toLocaleString()} - ${status}\n`;
      }
      return await logAndRespond(`END ${msg}`, { ...logOpts, menu: "payments" });
    }

    // ── 3. REGISTERED COURSES ──
    if (menuChoice === "3") {
      const { data: courses } = await serviceClient
        .from("student_courses")
        .select("semester, year_of_study, courses:course_id(code, title, credit_units)")
        .eq("student_id", userId)
        .order("year_of_study", { ascending: false })
        .limit(10);

      if (!courses || courses.length === 0) {
        return await logAndRespond("END No registered courses found.", {
          ...logOpts,
          menu: "courses",
        });
      }

      let msg = "Registered Courses:\n";
      for (const sc of courses) {
        const c = sc.courses as any;
        msg += `${c?.code} - ${c?.title} (Yr${sc.year_of_study}/S${sc.semester})\n`;
      }
      return await logAndRespond(`END ${msg}`, { ...logOpts, menu: "courses" });
    }

    // ── 4. NOTICES ──
    if (menuChoice === "4") {
      const { data: notices } = await serviceClient
        .from("notices")
        .select("title, content, priority")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!notices || notices.length === 0) {
        return await logAndRespond("END No active notices.", { ...logOpts, menu: "notices" });
      }

      let msg = "Latest Notices:\n";
      for (const n of notices) {
        const priorityTag = n.priority === "urgent" ? "[URGENT] " : "";
        msg += `${priorityTag}${n.title}\n`;
      }
      return await logAndRespond(`END ${msg}`, { ...logOpts, menu: "notices" });
    }

    // ── 5. CHANGE PIN ──
    if (menuChoice === "5") {
      // Step 1: Ask for new PIN
      if (level === 3) {
        return await logAndRespond("CON Enter new 4-digit PIN:", {
          ...logOpts,
          menu: "change_pin",
        });
      }

      const newPin = parts[3];

      // Step 2: Confirm new PIN
      if (level === 4) {
        // Validate new PIN format
        if (!/^\d{4}$/.test(newPin)) {
          return await logAndRespond("END Invalid PIN. Must be exactly 4 digits.", {
            ...logOpts,
            menu: "change_pin",
          });
        }
        return await logAndRespond("CON Confirm new PIN (enter again):", {
          ...logOpts,
          menu: "change_pin",
        });
      }

      const confirmPin = parts[4];

      // Step 3: Validate and save
      if (level === 5) {
        if (newPin !== confirmPin) {
          return await logAndRespond("END PINs do not match. Please try again.", {
            ...logOpts,
            menu: "change_pin",
          });
        }

        if (!/^\d{4}$/.test(newPin)) {
          return await logAndRespond("END Invalid PIN. Must be exactly 4 digits.", {
            ...logOpts,
            menu: "change_pin",
          });
        }

        // Update PIN in database
        const { error: updateErr } = await serviceClient
          .from("profiles")
          .update({ ussd_pin: newPin })
          .eq("user_id", userId);

        if (updateErr) {
          return await logAndRespond("END Failed to update PIN. Please try again later.", {
            ...logOpts,
            menu: "change_pin",
          });
        }

        return await logAndRespond("END PIN changed successfully!", {
          ...logOpts,
          menu: "change_pin",
          ended: true,
        });
      }
    }

    // ── 0. EXIT ──
    if (menuChoice === "0") {
      return await logAndRespond("END Thank you for using the Student Portal. Goodbye!", {
        ...logOpts,
        menu: "exit",
      });
    }

    return await logAndRespond("END Invalid selection. Please try again.", logOpts);
  } catch (err) {
    console.error("USSD Error:", err);
    return new Response("END An error occurred. Please try again later.", {
      headers: { "Content-Type": "text/plain" },
    });
  }
});
