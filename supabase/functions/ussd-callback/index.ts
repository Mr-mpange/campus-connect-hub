import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const text = formData.get("text") as string || "";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const parts = text.split("*");
    const level = parts.length;

    // Level 0: Welcome — ask for student ID
    if (text === "") {
      return respond("CON Welcome to the Student Portal.\nEnter your Student ID:");
    }

    const studentIdInput = parts[0];

    // Level 1: Student ID entered — ask for PIN
    if (level === 1) {
      return respond("CON Enter your 4-digit USSD PIN:");
    }

    const pinInput = parts[1];

    // Level 2+: Authenticate then handle menu
    // Authenticate
    const { data: profile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("user_id, full_name, student_id, department_id, ussd_pin")
      .eq("student_id", studentIdInput)
      .maybeSingle();

    if (profileErr || !profile) {
      return respond("END Student ID not found. Please check and try again.");
    }

    if (!profile.ussd_pin) {
      return respond("END USSD PIN not set. Please set your PIN in the web portal under Settings.");
    }

    if (profile.ussd_pin !== pinInput) {
      return respond("END Incorrect PIN. Please try again.");
    }

    const userId = profile.user_id;

    // Level 2: Show main menu
    if (level === 2) {
      return respond(
        `CON Welcome ${profile.full_name}!\n` +
        `1. Check Results\n` +
        `2. Payment Status\n` +
        `3. Registered Courses\n` +
        `4. Notices\n` +
        `0. Exit`
      );
    }

    const menuChoice = parts[2];

    // ===== 1. CHECK RESULTS =====
    if (menuChoice === "1") {
      // Level 3: Ask for academic session
      if (level === 3) {
        return respond("CON Enter Academic Session (e.g. 2024/2025):");
      }

      const session = parts[3];

      const { data: results } = await serviceClient
        .from("results")
        .select("grade, score, courses:course_id(code, title, credit_units)")
        .eq("student_id", userId)
        .eq("academic_session", session)
        .in("status", ["approved", "published"]);

      if (!results || results.length === 0) {
        return respond(`END No published results found for session ${session}.`);
      }

      let msg = `Results for ${session}:\n`;
      let totalPoints = 0, totalCredits = 0;

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

      return respond(`END ${msg}`);
    }

    // ===== 2. PAYMENT STATUS =====
    if (menuChoice === "2") {
      const { data: payments } = await serviceClient
        .from("payments")
        .select("control_number, payment_type, amount, status")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!payments || payments.length === 0) {
        return respond("END No payments found.");
      }

      const typeLabels: Record<string, string> = {
        tuition: "Tuition", exam: "Exam", registration: "Reg", retake: "Retake",
      };

      let msg = "Recent Payments:\n";
      for (const p of payments) {
        const type = typeLabels[p.payment_type] || p.payment_type;
        const status = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        msg += `${type}: TZS ${Number(p.amount).toLocaleString()} - ${status}\n`;
      }

      return respond(`END ${msg}`);
    }

    // ===== 3. REGISTERED COURSES =====
    if (menuChoice === "3") {
      const { data: courses } = await serviceClient
        .from("student_courses")
        .select("semester, year_of_study, courses:course_id(code, title, credit_units)")
        .eq("student_id", userId)
        .order("year_of_study", { ascending: false })
        .limit(10);

      if (!courses || courses.length === 0) {
        return respond("END No registered courses found.");
      }

      let msg = "Registered Courses:\n";
      for (const sc of courses) {
        const c = sc.courses as any;
        msg += `${c?.code} - ${c?.title} (Yr${sc.year_of_study}/S${sc.semester})\n`;
      }

      return respond(`END ${msg}`);
    }

    // ===== 4. NOTICES =====
    if (menuChoice === "4") {
      const { data: notices } = await serviceClient
        .from("notices")
        .select("title, content, priority")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!notices || notices.length === 0) {
        return respond("END No active notices.");
      }

      let msg = "Latest Notices:\n";
      for (const n of notices) {
        const priorityTag = n.priority === "urgent" ? "[URGENT] " : "";
        msg += `${priorityTag}${n.title}\n`;
      }

      return respond(`END ${msg}`);
    }

    // ===== 0. EXIT =====
    if (menuChoice === "0") {
      return respond("END Thank you for using the Student Portal. Goodbye!");
    }

    return respond("END Invalid selection. Please try again.");
  } catch (err) {
    console.error("USSD Error:", err);
    return respond("END An error occurred. Please try again later.");
  }
});

function respond(message: string): Response {
  return new Response(message, {
    headers: { "Content-Type": "text/plain" },
  });
}
