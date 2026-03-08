import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Receipt, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const paymentTypeLabels: Record<string, string> = {
  tuition: "Tuition Fees",
  exam: "Exam Fees",
  registration: "Registration Fees",
  retake: "Retake Fees",
};

const PaymentReceipt = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["my-receipts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription for payment status changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("payment-receipts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `student_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["my-receipts"] });
          qc.invalidateQueries({ queryKey: ["my-payments"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const statusIcon = (status: string) => {
    if (status === "paid") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === "cancelled") return <AlertCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />;
  };

  const statusBadge = (status: string) => {
    if (status === "paid") return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</Badge>;
    if (status === "cancelled") return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Cancelled</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
  };

  return (
    <div>
      <PageHeader title="Payment Receipts" description="View payment confirmations — status updates in real-time" />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No payments found. Generate a control number from the Payments page.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payments.map((p) => (
            <Card key={p.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${p.status === "paid" ? "bg-emerald-500" : p.status === "cancelled" ? "bg-destructive" : "bg-muted-foreground/30"}`} />
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(p.status)}
                  <div>
                    <CardTitle className="text-sm font-semibold">{paymentTypeLabels[p.payment_type] || p.payment_type}</CardTitle>
                    <p className="text-xs text-muted-foreground">{p.academic_session} — Semester {p.semester}</p>
                  </div>
                </div>
                {statusBadge(p.status)}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Control Number</p>
                    <p className="font-mono font-semibold text-foreground">{p.control_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-semibold text-foreground">TZS {Number(p.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Generated</p>
                    <p className="text-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid At</p>
                    <p className="text-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</p>
                  </div>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">{p.description}</p>
                )}
                {p.status === "paid" && (
                  <Button size="sm" variant="outline" className="gap-2 w-full" onClick={() => window.print()}>
                    <Printer className="w-3 h-3" /> Print Receipt
                  </Button>
                )}
                {p.status === "pending" && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse">
                    Waiting for payment confirmation…
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentReceipt;
