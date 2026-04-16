import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabaseClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callerId = claims.claims.sub as string;

    // Check admin role using service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, full_name, role, department_id, student_id, phone } = await req.json();

    // Create auth user with created_by_admin flag to prevent auto student role
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, created_by_admin: true },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = newUser.user.id;

    // Update profile with department, student_id, phone
    await supabaseAdmin.from("profiles").update({
      department_id: department_id || null,
      student_id: student_id || null,
      phone: phone || null,
      full_name,
    }).eq("user_id", userId);

    // Assign role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    // Send SMS with registration number if phone and student_id provided
    if (phone && student_id) {
      const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
      const atUsername = Deno.env.get("AFRICASTALKING_USERNAME");

      if (atApiKey && atUsername) {
        const message = `[UniSIMS] Welcome ${full_name}! Your registration number is: ${student_id}. Use it to login via USSD. Your default PIN is 1234 — you will be asked to change it on first use.`;
        
        const atUrl = atUsername === "sandbox"
          ? "https://api.sandbox.africastalking.com/version1/messaging"
          : "https://api.africastalking.com/version1/messaging";

        const smsForm = new URLSearchParams();
        smsForm.append("username", atUsername);
        smsForm.append("to", phone);
        smsForm.append("message", message);

        try {
          await fetch(atUrl, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded",
              apiKey: atApiKey,
            },
            body: smsForm.toString(),
          });
        } catch (smsErr) {
          console.error("Welcome SMS failed:", smsErr);
        }
      }
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: callerId,
      action: "create_user",
      table_name: "profiles",
      record_id: userId,
      new_data: { email, role, full_name, department_id },
    });

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
