import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CheckCircle2, Clock, Search, Banknote, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const paymentTypeLabels: Record<string, string> = {
  tuition: "Tuition",
  exam: "Exam",
  registration: "Registration",
  retake: "Retake",
};

const PaymentVerification = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [bulkSmsLoading, setBulkSmsLoading] = useState(false);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-payments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*, profiles:student_id(full_name, email, student_id)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const sendPaymentNotification = async (paymentId: string, action: string) => {
    try {
      await supabase.functions.invoke("payment-notification", {
        body: { payment_id: paymentId, action },
      });
    } catch (err) {
      console.warn("SMS notification failed:", err);
    }
  };

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", paymentId);
      if (error) throw error;
      return paymentId;
    },
    onSuccess: (paymentId) => {
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment verified — SMS notification sent to student");
      sendPaymentNotification(paymentId, "paid");
    },
    onError: (e) => toast.error(e.message),
  });

  const markCancelledMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "cancelled" })
        .eq("id", paymentId);
      if (error) throw error;
      return paymentId;
    },
    onSuccess: (paymentId) => {
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment cancelled — SMS notification sent to student");
      sendPaymentNotification(paymentId, "cancelled");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const profile = p.profiles as any;
    return (
      p.control_number.toLowerCase().includes(q) ||
      (profile?.full_name || "").toLowerCase().includes(q) ||
      (profile?.student_id || "").toLowerCase().includes(q) ||
      (profile?.email || "").toLowerCase().includes(q)
    );
  });

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div>
      <PageHeader title="Payment Verification" description="Review and verify student payments">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setBulkSmsOpen(true)}>
          <MessageSquare className="w-4 h-4" /> Send Payment Reminders
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Amount" value={`TZS ${totalAmount.toLocaleString()}`} icon={Banknote} />
        <StatCard title="Verified" value={paidCount.toString()} icon={CheckCircle2} subtitle="payments" />
        <StatCard title="Pending" value={pendingCount.toString()} icon={Clock} subtitle="awaiting verification" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, student ID, or control number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No payments found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Control Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const profile = p.profiles as any;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{profile?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{profile?.student_id || profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{p.control_number}</TableCell>
                    <TableCell>{paymentTypeLabels[p.payment_type] || p.payment_type}</TableCell>
                    <TableCell>TZS {Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{p.academic_session} / Sem {p.semester}</TableCell>
                    <TableCell>
                      {p.status === "paid" ? (
                        <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</Badge>
                      ) : p.status === "cancelled" ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {p.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs"
                            onClick={() => markPaidMutation.mutate(p.id)}
                            disabled={markPaidMutation.isPending}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => markCancelledMutation.mutate(p.id)}
                            disabled={markCancelledMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default PaymentVerification;
