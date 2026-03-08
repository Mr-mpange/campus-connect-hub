import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Clock, Search, Banknote, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const paymentTypeLabels: Record<string, string> = {
  tuition: "Tuition",
  exam: "Exam",
  registration: "Registration",
  retake: "Retake",
};

const PaymentVerification = () => {
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
  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div>
      <PageHeader title="Payment Monitoring" description="Track student payments — verified automatically when paid via control number">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setBulkSmsOpen(true)}>
          <MessageSquare className="w-4 h-4" /> Send Payment Reminders
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Billed" value={`TZS ${totalAmount.toLocaleString()}`} icon={Banknote} />
        <StatCard title="Total Collected" value={`TZS ${paidTotal.toLocaleString()}`} icon={CheckCircle2} />
        <StatCard title="Verified" value={paidCount.toString()} icon={CheckCircle2} subtitle="auto-confirmed" />
        <StatCard title="Pending" value={pendingCount.toString()} icon={Clock} subtitle="awaiting payment" />
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
                <TableHead>Paid At</TableHead>
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
                        <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Cancelled</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bulk SMS Reminder Dialog */}
      <Dialog open={bulkSmsOpen} onOpenChange={setBulkSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bulk Payment Reminders</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will send an SMS reminder to all students with <strong>pending</strong> payments.
            {pendingCount > 0 ? ` ${pendingCount} student(s) will be notified.` : " No pending payments found."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkSmsOpen(false)}>Cancel</Button>
            <Button
              disabled={pendingCount === 0 || bulkSmsLoading}
              onClick={async () => {
                setBulkSmsLoading(true);
                try {
                  const pendingPayments = payments.filter((p) => p.status === "pending");
                  const studentIds = [...new Set(pendingPayments.map((p) => p.student_id))];
                  await supabase.functions.invoke("send-sms-notification", {
                    body: { type: "payment_reminder", student_ids: studentIds },
                  });
                  toast.success(`Payment reminders sent to ${studentIds.length} student(s)`);
                  setBulkSmsOpen(false);
                } catch {
                  toast.error("Failed to send SMS reminders");
                } finally {
                  setBulkSmsLoading(false);
                }
              }}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {bulkSmsLoading ? "Sending…" : "Send Reminders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentVerification;
