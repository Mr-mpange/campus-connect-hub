import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const Approvals = () => {
  const qc = useQueryClient();
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [sendSmsOnApprove, setSendSmsOnApprove] = useState(true);
  const [smsLoading, setSmsLoading] = useState(false);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("*, courses:course_id(code, title)")
        .in("status", ["submitted"])
        .order("submitted_at", { ascending: false });
      if (error) throw error;

      // Group by course + lecturer + session
      const groups = new Map<string, {
        courseCode: string;
        courseTitle: string;
        lecturerId: string;
        academicSession: string;
        count: number;
        submittedAt: string;
        resultIds: string[];
      }>();

      data.forEach((r) => {
        const key = `${r.course_id}-${r.lecturer_id}-${r.academic_session}`;
        const course = r.courses as { code: string; title: string } | null;
        if (!groups.has(key)) {
          groups.set(key, {
            courseCode: course?.code || "",
            courseTitle: course?.title || "",
            lecturerId: r.lecturer_id,
            academicSession: r.academic_session,
            count: 0,
            submittedAt: r.submitted_at || r.created_at,
            resultIds: [],
          });
        }
        const g = groups.get(key)!;
        g.count++;
        g.resultIds.push(r.id);
      });

      return Array.from(groups.values());
    },
  });

  // Detail view: results for a specific group
  const { data: detailResults = [] } = useQuery({
    queryKey: ["approval-detail", selectedResult],
    queryFn: async () => {
      if (!selectedResult) return [];
      const group = submissions.find((s) => s.resultIds[0] === selectedResult);
      if (!group) return [];
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .in("id", group.resultIds);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedResult,
  });

  const approveMutation = useMutation({
    mutationFn: async (resultIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("results")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user.id })
        .in("id", resultIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Results approved");
      setSelectedResult(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ resultIds, reason }: { resultIds: string[]; reason: string }) => {
      const { error } = await supabase
        .from("results")
        .update({ status: "rejected", rejection_reason: reason })
        .in("id", resultIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Results rejected");
      setRejectDialogId(null);
      setRejectionReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Result Approvals" description="Review and approve submitted academic results" />

      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : submissions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending submissions</TableCell></TableRow>
            ) : submissions.map((s) => (
              <TableRow key={s.resultIds[0]}>
                <TableCell className="font-medium">{s.courseCode} — {s.courseTitle}</TableCell>
                <TableCell>{s.academicSession}</TableCell>
                <TableCell><Badge variant="secondary">{s.count} students</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(s.submittedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="View details" onClick={() => setSelectedResult(s.resultIds[0])}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Approve" onClick={() => approveMutation.mutate(s.resultIds)}>
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Reject" onClick={() => { setRejectDialogId(s.resultIds[0]); setRejectionReason(""); }}>
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Result Details</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.student_id.slice(0, 8)}…</TableCell>
                    <TableCell>{r.score}</TableCell>
                    <TableCell>{r.grade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedResult(null)}>Close</Button>
            {selectedResult && (
              <Button onClick={() => {
                const group = submissions.find((s) => s.resultIds[0] === selectedResult);
                if (group) approveMutation.mutate(group.resultIds);
              }}>Approve All</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={() => setRejectDialogId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Results</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why these results are being rejected…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const group = submissions.find((s) => s.resultIds[0] === rejectDialogId);
              if (group) rejectMutation.mutate({ resultIds: group.resultIds, reason: rejectionReason });
            }} disabled={!rejectionReason.trim() || rejectMutation.isPending}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
