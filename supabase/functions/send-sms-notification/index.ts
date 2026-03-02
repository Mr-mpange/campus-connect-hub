import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, course_id, academic_session } = await req.json();

    // Use service role to fetch student data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get course info
    const { data: course } = await serviceClient
      .from("courses")
      .select("code, title")
      .eq("id", course_id)
      .single();

    // Get students with results for this course
    const { data: results } = await serviceClient
      .from("results")
      .select("student_id")
      .eq("course_id", course_id)
      .eq("academic_session", academic_session);

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ message: "No students to notify", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentIds = [...new Set(results.map((r: any) => r.student_id))];

    // Get phone numbers from profiles
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("user_id, phone, full_name")
      .in("user_id", studentIds);

    const phoneNumbers = (profiles || [])
      .filter((p: any) => p.phone)
      .map((p: any) => ({ phone: p.phone, name: p.full_name }));

    if (phoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No students with phone numbers", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send SMS via Africa's Talking
    const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY")!;
    const atUsername = Deno.env.get("AFRICASTALKING_USERNAME")!;

    const message =
      type === "published"
        ? `Your results for ${course?.code || ""} - ${course?.title || ""} (${academic_session}) have been published. Check your student portal.`
        : `Results for ${course?.code || ""} - ${course?.title || ""} (${academic_session}) have been submitted for approval.`;

    const recipients = phoneNumbers.map((p: any) => p.phone).join(",");

    const atUrl =
      atUsername === "sandbox"
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";

    const formData = new URLSearchParams();
    formData.append("username", atUsername);
    formData.append("to", recipients);
    formData.append("message", message);

    const atResponse = await fetch(atUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: atApiKey,
      },
      body: formData.toString(),
    });

    const atResult = await atResponse.json();

    return new Response(
      JSON.stringify({
        message: "SMS notifications sent",
        sent: phoneNumbers.length,
        atResponse: atResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
