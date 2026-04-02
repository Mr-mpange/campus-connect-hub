import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Users, UserCheck, Link2 } from "lucide-react";
import { toast } from "sonner";

const HodDashboard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedLecturer, setSelectedLecturer] = useState("");
  const [academicSession, setAcademicSession] = useState("2024/2025");
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [selectedLevel, setSelectedLevel] = useState("bachelor");

  // Fetch department courses
  const { data: courses = [] } = useQuery({
    queryKey: ["hod-courses", user?.departmentId],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", user.departmentId)
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.departmentId,
  });

  // Fetch department lecturers
  const { data: lecturers = [] } = useQuery({
    queryKey: ["hod-lecturers", user?.departmentId],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      // Get lecturer role users in this department
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("department_id", user.departmentId)
        .eq("is_active", true);
      if (error) throw error;

      // Filter to only lecturers
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", (profiles || []).map((p) => p.user_id))
        .eq("role", "lecturer");

      const lecturerIds = new Set((roles || []).map((r) => r.user_id));
      return (profiles || []).filter((p) => lecturerIds.has(p.user_id));
    },
    enabled: !!user?.departmentId,
  });

  // Fetch existing allocations
  const { data: allocations = [] } = useQuery({
    queryKey: ["hod-allocations", user?.departmentId],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("course_allocations")
        .select("*, courses:course_id(code, title), profiles:lecturer_id(full_name, email)")
        .in("course_id", courseIds)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: courses.length > 0,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse || !selectedLecturer) throw new Error("Select course and lecturer");
      const { error } = await supabase.from("course_allocations").upsert(
        {
          course_id: selectedCourse,
          lecturer_id: selectedLecturer,
          academic_session: academicSession,
          semester: selectedSemester,
          level: selectedLevel,
          is_active: true,
        },
        { onConflict: "course_id,lecturer_id,academic_session" as never }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hod-allocations"] });
      toast.success("Lecturer assigned to course");
      setSelectedCourse("");
      setSelectedLecturer("");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      const { error } = await supabase
        .from("course_allocations")
        .update({ is_active: false })
        .eq("id", allocationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hod-allocations"] });
      toast.success("Allocation removed");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title={`HOD Dashboard — ${user?.department || ""}`}
        description="Manage lecturer-course assignments within your department"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Department Courses" value={courses.length.toString()} icon={BookOpen} />
        <StatCard title="Department Lecturers" value={lecturers.length.toString()} icon={Users} />
        <StatCard title="Active Allocations" value={allocations.length.toString()} icon={UserCheck} />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Assign Lecturer to Course</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lecturer</Label>
              <Select value={selectedLecturer} onValueChange={setSelectedLecturer}>
                <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                <SelectContent>
                  {lecturers.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>{l.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Semester</Label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="diploma">Diploma</SelectItem>
                  <SelectItem value="bachelor">Bachelor</SelectItem>
                  <SelectItem value="masters">Masters</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Session</Label>
              <Input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} />
            </div>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending} className="gap-2">
              <Link2 className="w-4 h-4" /> Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Current Allocations</h2>
        </div>
        {allocations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No allocations yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((a) => {
                const course = a.courses as any;
                const lecturer = a.profiles as any;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{course?.code} — {course?.title}</TableCell>
                    <TableCell>{lecturer?.full_name || "—"}</TableCell>
                    <TableCell>{a.academic_session}</TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => removeMutation.mutate(a.id)}
                        disabled={removeMutation.isPending}
                      >
                        Remove
                      </Button>
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

export default HodDashboard;
