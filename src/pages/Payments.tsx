import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle2, Clock, AlertCircle, Receipt } from "lucide-react";
import { toast } from "sonner";

function generateControlNumber(): string {
  const prefix = "CTR";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

const paymentTypeLabels: Record<string, string> = {
  tuition: "Tuition Fees",
  exam: "Exam Fees",
  registration: "Registration Fees",
  retake: "Retake Fees",
};

const Payments = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [paymentType, setPaymentType] = useState("");
  const [amount, setAmount] = useState("");
  const [semester, setSemester] = useState("1");
  const [academicSession, setAcademicSession] = useState("2024/2025");
  const [description, setDescription] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["my-payments", user?.id],
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

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!paymentType) throw new Error("Select payment type");
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) throw new Error("Enter a valid amount");

      const controlNumber = generateControlNumber();
      const { error } = await supabase.from("payments").insert({
        student_id: user.id,
        control_number: controlNumber,
        payment_type: paymentType,
        amount: numAmount,
        academic_session: academicSession,
        semester,
        description: description || undefined,
      });
      if (error) throw error;
      return controlNumber;
    },
    onSuccess: (controlNumber) => {
      qc.invalidateQueries({ queryKey: ["my-payments"] });
      toast.success(`Control number generated: ${controlNumber}`);
      setAmount("");
      setDescription("");
      setPaymentType("");
    },
    onError: (e) => toast.error(e.message),
  });

  const paidCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <PageHeader title="Payments" description="Generate control numbers and track your payment status" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Paid" value={`TZS ${totalPaid.toLocaleString()}`} icon={CreditCard} />
        <StatCard title="Paid" value={paidCount.toString()} icon={CheckCircle2} subtitle="payments" />
        <StatCard title="Pending" value={pendingCount.toString()} icon={Clock} subtitle="awaiting payment" />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Generate Control Number</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tuition">Tuition Fees</SelectItem>
                  <SelectItem value="exam">Exam Fees</SelectItem>
                  <SelectItem value="registration">Registration Fees</SelectItem>
                  <SelectItem value="retake">Retake Fees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (TZS)</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Session</Label>
              <Input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="gap-2">
              <Receipt className="w-4 h-4" /> Generate
            </Button>
          </div>
          <div className="mt-2">
            <Label className="text-xs">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. First semester tuition" />
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Payment History</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No payments yet.</div>
        ) : (
          <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Control Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold">{p.control_number}</TableCell>
                  <TableCell>{paymentTypeLabels[p.payment_type] || p.payment_type}</TableCell>
                  <TableCell>TZS {Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell>{p.academic_session}</TableCell>
                  <TableCell>Sem {p.semester}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
