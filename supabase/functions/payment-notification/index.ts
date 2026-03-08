import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Payment Notification Webhook
 * 
 * Called by the payment gateway (e.g. GePG, bank, mobile money) when a student pays.
 * Automatically marks the payment as "paid" and sends an SMS confirmation.
 * 
 * Expected payload:
 *   { control_number: string, amount_paid?: number, transaction_id?: string }
 * 
 * No auth required — this is a public webhook endpoint for the payment gateway.
 */

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
    let controlNumber: string;
    let amountPaid: number | null = null;
    let transactionId: string | null = null;

    // Support both JSON and form-data from different payment gateways
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      controlNumber = body.control_number;
      amountPaid = body.amount_paid || null;
      transactionId = body.transaction_id || null;
    } else {
      const formData = await req.formData();
      controlNumber = formData.get("control_number") as string;
      amountPaid = parseFloat(formData.get("amount_paid") as string) || null;
      transactionId = formData.get("transaction_id") as string || null;
    }

    if (!controlNumber) {
      return new Response(
        JSON.stringify({ error: "Missing control_number" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find the payment by control number
    const { data: payment, error: paymentErr } = await serviceClient
      .from("payments")
      .select("id, student_id, amount, control_number, payment_type, academic_session, semester, status")
      .eq("control_number", controlNumber)
      .single();

    if (paymentErr || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found for this control number" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Already paid — idempotent
    if (payment.status === "paid") {
      return new Response(
        JSON.stringify({ message: "Payment already verified", payment_id: payment.id }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Auto-verify: mark as paid
    const { error: updateErr } = await serviceClient
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        description: payment.status === "pending"
          ? `Auto-verified${transactionId ? ` (Txn: ${transactionId})` : ""}`
          : undefined,
      })
      .eq("id", payment.id);

    if (updateErr) {
      console.error("Failed to update payment:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update payment status" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send SMS confirmation to the student
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("phone, full_name")
      .eq("user_id", payment.student_id)
      .single();

    let smsSent = false;

    if (profile?.phone) {
      const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
      const atUsername = Deno.env.get("AFRICASTALKING_USERNAME");

      if (atApiKey && atUsername) {
        const typeLabels: Record<string, string> = {
          tuition: "Tuition",
          exam: "Exam",
          registration: "Registration",
          retake: "Retake",
        };

        const typeName = typeLabels[payment.payment_type] || payment.payment_type;
        const amount = Number(payment.amount).toLocaleString();

        const message = `[UniSIMS] Dear ${profile.full_name}, your ${typeName} payment of TZS ${amount} (Control No: ${payment.control_number}) has been received. Session: ${payment.academic_session}, Sem ${payment.semester}. Thank you!`;

        const atUrl = atUsername === "sandbox"
          ? "https://api.sandbox.africastalking.com/version1/messaging"
          : "https://api.africastalking.com/version1/messaging";

        const smsForm = new URLSearchParams();
        smsForm.append("username", atUsername);
        smsForm.append("to", profile.phone);
        smsForm.append("message", message);

        try {
          const atResponse = await fetch(atUrl, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded",
              apiKey: atApiKey,
            },
            body: smsForm.toString(),
          });
          await atResponse.json();
          smsSent = true;
        } catch (smsErr) {
          console.error("SMS send failed:", smsErr);
        }
      }
    }

    // Log to audit
    await serviceClient.from("audit_logs").insert({
      action: "payment_auto_verified",
      table_name: "payments",
      record_id: payment.id,
      new_data: { control_number: controlNumber, amount_paid: amountPaid, transaction_id: transactionId },
    });

    return new Response(
      JSON.stringify({
        message: "Payment verified successfully",
        payment_id: payment.id,
        sms_sent: smsSent,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Payment webhook error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
