import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface CourseAllocationManagerProps {
  courseId: string;
  courseCode: string;
}

const CourseAllocationManager = ({ courseId, courseCode }: CourseAllocationManagerProps) => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState("");
  const [session, setSession] = useState("2024/2025");
  const [semester, setSemester] = useState("1");
  const [level, setLevel] = useState("bachelor");

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ["allocations", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_allocations")
        .select("*, profiles:lecturer_id(full_name, email)")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((a) => ({
        ...a,
        lecturerName: (a.profiles as unknown as { full_name: string; email: string } | null)?.full_name || "",
        lecturerEmail: (a.profiles as unknown as { full_name: string; email: string } | null)?.email || "",
      }));
    },
  });

  // Fetch lecturers (users with lecturer role)
  const { data: lecturers = [] } = useQuery({
    queryKey: ["lecturers-list"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "lecturer");
      if (error) throw error;
      if (!roles?.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", roles.map((r) => r.user_id))
        .eq("is_active", true);
      return profiles || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLecturer) throw new Error("Select a lecturer");
      const { error } = await supabase.from("course_allocations").insert({
        course_id: courseId,
        lecturer_id: selectedLecturer,
        academic_session: session,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allocations", courseId] });
      toast.success("Lecturer assigned");
      setDialogOpen(false);
      setSelectedLecturer("");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_allocations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allocations", courseId] });
      toast.success("Allocation removed");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Lecturer Allocations — {courseCode}</h3>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> Assign
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allocations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lecturers assigned yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lecturer</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm">{a.lecturerName} <span className="text-muted-foreground text-xs">({a.lecturerEmail})</span></TableCell>
                <TableCell>{a.academic_session}</TableCell>
                <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(a.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Lecturer to {courseCode}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Lecturer</Label>
              <Select value={selectedLecturer} onValueChange={setSelectedLecturer}>
                <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                <SelectContent>
                  {lecturers.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>{l.full_name} ({l.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Session</Label>
              <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="2024/2025" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !selectedLecturer}>
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseAllocationManager;
