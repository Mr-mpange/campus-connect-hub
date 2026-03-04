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

    const { payment_id, action } = await req.json();

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get payment details
    const { data: payment, error: paymentErr } = await serviceClient
      .from("payments")
      .select("student_id, amount, control_number, payment_type, academic_session, semester")
      .eq("id", payment_id)
      .single();

    if (paymentErr || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student profile with phone
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("phone, full_name")
      .eq("user_id", payment.student_id)
      .single();

    if (!profile?.phone) {
      return new Response(
        JSON.stringify({ message: "Student has no phone number", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabels: Record<string, string> = {
      tuition: "Tuition",
      exam: "Exam",
      registration: "Registration",
      retake: "Retake",
    };

    const typeName = typeLabels[payment.payment_type] || payment.payment_type;
    const amount = Number(payment.amount).toLocaleString();

    const message =
      action === "paid"
        ? `Dear ${profile.full_name}, your ${typeName} payment of TZS ${amount} (Control No: ${payment.control_number}) has been verified. Session: ${payment.academic_session}, Sem ${payment.semester}.`
        : `Dear ${profile.full_name}, your ${typeName} payment (Control No: ${payment.control_number}) has been cancelled. Please contact the finance office for details.`;

    // Send SMS via Africa's Talking
    const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY")!;
    const atUsername = Deno.env.get("AFRICASTALKING_USERNAME")!;

    const atUrl =
      atUsername === "sandbox"
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";

    const formData = new URLSearchParams();
    formData.append("username", atUsername);
    formData.append("to", profile.phone);
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
      JSON.stringify({ message: "SMS notification sent", sent: 1, atResponse: atResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
