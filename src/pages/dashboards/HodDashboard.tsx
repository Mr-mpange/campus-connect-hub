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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, UserCheck, Link2, GraduationCap, FileText } from "lucide-react";
import { toast } from "sonner";

const HodDashboard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedLecturer, setSelectedLecturer] = useState("");
  const [academicSession, setAcademicSession] = useState("2024/2025");
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [selectedLevel, setSelectedLevel] = useState("bachelor");
  const [selectedYear, setSelectedYear] = useState("1");

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
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("department_id", user.departmentId)
        .eq("is_active", true);
      if (error) throw error;
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

  // Fetch department students
  const { data: students = [] } = useQuery({
    queryKey: ["hod-students", user?.departmentId],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, student_id, year_of_study")
        .eq("department_id", user.departmentId)
        .eq("is_active", true);
      if (error) throw error;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", (profiles || []).map((p) => p.user_id))
        .eq("role", "student");
      const studentIds = new Set((roles || []).map((r) => r.user_id));
      return (profiles || []).filter((p) => studentIds.has(p.user_id));
    },
    enabled: !!user?.departmentId,
  });

  // Fetch existing allocations
  const { data: allocations = [] } = useQuery({
    queryKey: ["hod-allocations", user?.departmentId, courses],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("course_allocations")
        .select("*, courses:course_id(code, title)")
        .in("course_id", courseIds)
        .eq("is_active", true);
      if (error) throw error;
      const lecturerIds = [...new Set(data.map((a) => a.lecturer_id))];
      if (lecturerIds.length === 0) return data.map((a) => ({ ...a, profiles: null }));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", lecturerIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return data.map((a) => ({ ...a, profiles: profileMap.get(a.lecturer_id) || null }));
    },
    enabled: courses.length > 0,
  });

  // Fetch department results
  const { data: deptResults = [] } = useQuery({
    queryKey: ["hod-results", user?.departmentId, courses],
    queryFn: async () => {
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("results")
        .select("*, courses:course_id(code, title)")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(100);
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
          year_of_study: parseInt(selectedYear),
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

  const submittedResults = deptResults.filter((r) => r.status === "submitted");
  const approvedResults = deptResults.filter((r) => r.status === "approved" || r.status === "published");

  return (
    <div>
      <PageHeader
        title={`HOD Dashboard — ${user?.department || ""}`}
        description="Manage your department's courses, lecturers, students, and results"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="Courses" value={courses.length.toString()} icon={BookOpen} />
        <StatCard title="Lecturers" value={lecturers.length.toString()} icon={Users} />
        <StatCard title="Students" value={students.length.toString()} icon={GraduationCap} />
        <StatCard title="Allocations" value={allocations.length.toString()} icon={UserCheck} />
        <StatCard title="Pending Results" value={submittedResults.length.toString()} icon={FileText} />
      </div>

      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocations">Lecturer Assignments</TabsTrigger>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          <TabsTrigger value="results">Results ({deptResults.length})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
        </TabsList>

        {/* ALLOCATIONS TAB */}
        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assign Lecturer to Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
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
                  <Label className="text-xs">Session</Label>
                  <Input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Semester</Label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Level</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs">Year of Study</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="5">5th Year</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <TableHead>Semester</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Session</TableHead>
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
                        <TableCell>Sem {a.semester || "—"}</TableCell>
                        <TableCell className="capitalize">{a.level || "—"}</TableCell>
                        <TableCell>Year {a.year_of_study}</TableCell>
                        <TableCell>{a.academic_session}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="text-xs"
                            onClick={() => removeMutation.mutate(a.id)} disabled={removeMutation.isPending}>
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
        </TabsContent>

        {/* STUDENTS TAB */}
        <TabsContent value="students">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Department Students</h2>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No students in this department.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{s.email}</TableCell>
                      <TableCell>{s.student_id || "—"}</TableCell>
                      <TableCell>{s.year_of_study ? `Year ${s.year_of_study}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* RESULTS TAB */}
        <TabsContent value="results">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Department Results Overview</h2>
            </div>
            {deptResults.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No results uploaded yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptResults.map((r) => {
                    const course = r.courses as any;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{course?.code} — {course?.title}</TableCell>
                        <TableCell>{r.academic_session}</TableCell>
                        <TableCell>{r.score ?? "—"}</TableCell>
                        <TableCell className="font-semibold">{r.grade || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "approved" || r.status === "published" ? "default" : r.status === "submitted" ? "secondary" : "outline"}>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* COURSES TAB */}
        <TabsContent value="courses">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Department Courses</h2>
            </div>
            {courses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No courses in this department.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.code}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>{c.credit_units}</TableCell>
                      <TableCell>{c.semester || "—"}</TableCell>
                      <TableCell>{c.level || "—"}</TableCell>
                      <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HodDashboard;
