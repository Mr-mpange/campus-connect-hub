import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SmsRequest {
  type: "results_published" | "payment_received" | "payment_reminder" | "notice" | "results_submitted";
  // For results
  course_id?: string;
  academic_session?: string;
  // For payments
  student_ids?: string[];
  // For notices
  notice_id?: string;
  // For targeting
  department_id?: string;
  target_role?: string;
}

async function sendSms(
  recipients: string[],
  message: string,
  atApiKey: string,
  atUsername: string
) {
  if (recipients.length === 0) return { sent: 0, atResponse: null };

  const atUrl =
    atUsername === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

  const formData = new URLSearchParams();
  formData.append("username", atUsername);
  formData.append("to", recipients.join(","));
  formData.append("message", message);

  const response = await fetch(atUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey: atApiKey,
    },
    body: formData.toString(),
  });

  const result = await response.json();
  return { sent: recipients.length, atResponse: result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SmsRequest = await req.json();
    const { type } = body;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY")!;
    const atUsername = Deno.env.get("AFRICASTALKING_USERNAME")!;

    if (!atApiKey || !atUsername) {
      return new Response(
        JSON.stringify({ error: "Africa's Talking credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RESULTS PUBLISHED / SUBMITTED ──
    if (type === "results_published" || type === "results_submitted") {
      const { course_id, academic_session } = body;

      const { data: course } = await serviceClient
        .from("courses")
        .select("code, title")
        .eq("id", course_id!)
        .single();

      // Get students from both results table AND student_courses (registered students)
      const [resultsRes, registeredRes] = await Promise.all([
        serviceClient
          .from("results")
          .select("student_id")
          .eq("course_id", course_id!)
          .eq("academic_session", academic_session!),
        serviceClient
          .from("student_courses")
          .select("student_id")
          .eq("course_id", course_id!)
          .eq("academic_session", academic_session!),
      ]);

      const allStudentIds = new Set<string>();
      (resultsRes.data || []).forEach((r: any) => allStudentIds.add(r.student_id));
      (registeredRes.data || []).forEach((r: any) => allStudentIds.add(r.student_id));

      if (allStudentIds.size === 0) {
        return new Response(
          JSON.stringify({ message: "No students to notify", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const studentIds = [...allStudentIds];
      const { data: profiles } = await serviceClient
        .from("profiles")
        .select("phone")
        .in("user_id", studentIds);

      const phones = (profiles || []).filter((p: any) => p.phone).map((p: any) => p.phone);

      const message =
        type === "results_published"
          ? `[UniSIMS] Results for ${course?.code} - ${course?.title} (${academic_session}) are now published. Dial *123# or visit the portal to view.`
          : `[UniSIMS] Results for ${course?.code} - ${course?.title} (${academic_session}) have been submitted for review.`;

      const result = await sendSms(phones, message, atApiKey, atUsername);
      return new Response(JSON.stringify({ message: "SMS sent", ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PAYMENT RECEIVED ──
    if (type === "payment_received") {
      const { student_ids } = body;
      if (!student_ids || student_ids.length === 0) {
        return new Response(
          JSON.stringify({ message: "No students specified", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profiles } = await serviceClient
        .from("profiles")
        .select("phone")
        .in("user_id", student_ids);

      const phones = (profiles || []).filter((p: any) => p.phone).map((p: any) => p.phone);

      const message =
        "[UniSIMS] Your payment has been received and verified. Dial *123# or visit the portal for details.";

      const result = await sendSms(phones, message, atApiKey, atUsername);
      return new Response(JSON.stringify({ message: "SMS sent", ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PAYMENT REMINDER ──
    if (type === "payment_reminder") {
      const { student_ids } = body;
      if (!student_ids || student_ids.length === 0) {
        return new Response(
          JSON.stringify({ message: "No students specified", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profiles } = await serviceClient
        .from("profiles")
        .select("phone")
        .in("user_id", student_ids);

      const phones = (profiles || []).filter((p: any) => p.phone).map((p: any) => p.phone);

      const message =
        "[UniSIMS] Reminder: You have a pending fee payment. Please pay before the deadline. Dial *123# or visit the portal.";

      const result = await sendSms(phones, message, atApiKey, atUsername);
      return new Response(JSON.stringify({ message: "SMS sent", ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── NOTICE BROADCAST ──
    if (type === "notice") {
      const { notice_id, department_id, target_role } = body;

      // Get the notice
      const { data: notice } = await serviceClient
        .from("notices")
        .select("title, content, priority")
        .eq("id", notice_id!)
        .single();

      if (!notice) {
        return new Response(
          JSON.stringify({ error: "Notice not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build query for target profiles
      let profileQuery = serviceClient.from("profiles").select("phone");

      if (department_id) {
        profileQuery = profileQuery.eq("department_id", department_id);
      }

      // If targeting a specific role, get user IDs with that role first
      if (target_role) {
        const { data: roleUsers } = await serviceClient
          .from("user_roles")
          .select("user_id")
          .eq("role", target_role);

        if (roleUsers && roleUsers.length > 0) {
          const userIds = roleUsers.map((r: any) => r.user_id);
          profileQuery = profileQuery.in("user_id", userIds);
        }
      }

      const { data: profiles } = await profileQuery;
      const phones = (profiles || []).filter((p: any) => p.phone).map((p: any) => p.phone);

      const urgentTag = notice.priority === "urgent" ? "[URGENT] " : "";
      const message = `[UniSIMS] ${urgentTag}${notice.title}\n${notice.content.substring(0, 120)}`;

      const result = await sendSms(phones, message, atApiKey, atUsername);
      return new Response(JSON.stringify({ message: "SMS sent", ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown notification type: ${type}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("SMS Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
