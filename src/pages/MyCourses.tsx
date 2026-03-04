import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, GraduationCap, TrendingUp, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function computeGPA(results: { grade: string | null; credit_units: number }[]): string {
  let totalPoints = 0, totalCredits = 0;
  results.forEach((r) => {
    if (r.grade && gradePoints[r.grade] !== undefined) {
      totalPoints += gradePoints[r.grade] * r.credit_units;
      totalCredits += r.credit_units;
    }
  });
  return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "—";
}

const MyCourses = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [semester, setSemester] = useState("1");
  const [yearOfStudy, setYearOfStudy] = useState("1");
  const [academicSession, setAcademicSession] = useState("2024/2025");
  const [showRegistration, setShowRegistration] = useState(false);

  // Fetch registered courses
  const { data: studentCourses = [], isLoading } = useQuery({
    queryKey: ["my-student-courses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("student_courses")
        .select("*, courses:course_id(id, code, title, credit_units, semester, level)")
        .eq("student_id", user.id)
        .order("year_of_study", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch available courses for registration (department courses)
  const { data: availableCourses = [] } = useQuery({
    queryKey: ["available-courses", user?.departmentId, semester],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", user.departmentId)
        .eq("is_active", true)
        .eq("semester", semester)
        .order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.departmentId && showRegistration,
  });

  // Fetch results for GPA
  const { data: results = [] } = useQuery({
    queryKey: ["my-results-for-gpa", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("results")
        .select("course_id, grade, courses:course_id(credit_units)")
        .eq("student_id", user.id)
        .in("status", ["approved", "published"]);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Already registered course IDs
  const registeredCourseIds = new Set(studentCourses.map((sc) => sc.course_id));

  // Courses not yet registered
  const unregisteredCourses = availableCourses.filter((c) => !registeredCourseIds.has(c.id));

  const registerMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("student_courses").insert({
        student_id: user.id,
        course_id: courseId,
        semester,
        year_of_study: parseInt(yearOfStudy),
        academic_session: academicSession,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-student-courses"] });
      qc.invalidateQueries({ queryKey: ["available-courses"] });
      toast.success("Course registered successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  // Group courses by year
  const grouped = new Map<number, typeof studentCourses>();
  studentCourses.forEach((sc) => {
    const year = sc.year_of_study;
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year)!.push(sc);
  });

  // Build result map for grades
  const resultMap = new Map<string, string | null>();
  results.forEach((r) => resultMap.set(r.course_id, r.grade));

  const allGPA = computeGPA(
    results.map((r) => ({
      grade: r.grade,
      credit_units: (r.courses as any)?.credit_units || 0,
    }))
  );

  const totalCredits = studentCourses.reduce(
    (sum, sc) => sum + ((sc.courses as any)?.credit_units || 0),
    0
  );

  return (
    <div>
      <PageHeader title="My Courses" description="View your registered courses and register for new ones" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Cumulative GPA" value={allGPA} icon={GraduationCap} />
        <StatCard title="Total Courses" value={studentCourses.length.toString()} icon={BookOpen} />
        <StatCard title="Total Credits" value={totalCredits.toString()} icon={TrendingUp} />
      </div>

      {/* Course Registration Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Course Registration</CardTitle>
            <Button
              variant={showRegistration ? "secondary" : "default"}
              size="sm"
              onClick={() => setShowRegistration(!showRegistration)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              {showRegistration ? "Hide" : "Register Courses"}
            </Button>
          </div>
        </CardHeader>
        {showRegistration && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
              <div className="space-y-1">
                <Label className="text-xs">Year of Study</Label>
                <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Academic Session</Label>
                <Input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} />
              </div>
            </div>

            {unregisteredCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No available courses for this semester, or all courses already registered.
              </p>
            ) : (
              <div className="bg-card border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unregisteredCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.code}</TableCell>
                        <TableCell>{course.title}</TableCell>
                        <TableCell>{course.credit_units}</TableCell>
                        <TableCell>{course.level || "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => registerMutation.mutate(course.id)}
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            Register
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Registered Courses */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading courses…</p>
      ) : studentCourses.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No courses registered yet. Use the registration form above to add courses.
        </div>
      ) : (
        Array.from(grouped.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, courses]) => {
            const sem1 = courses.filter((c) => (c.courses as any)?.semester === "1" || c.semester === "1");
            const sem2 = courses.filter((c) => (c.courses as any)?.semester === "2" || c.semester === "2");

            return (
              <div key={year} className="mb-8">
                <h3 className="text-sm font-bold text-foreground mb-3">Year {year}</h3>
                {[{ label: "Semester 1", items: sem1 }, { label: "Semester 2", items: sem2 }]
                  .filter((s) => s.items.length > 0)
                  .map((semGroup) => {
                    const semCredits = semGroup.items.reduce((s, c) => s + ((c.courses as any)?.credit_units || 0), 0);
                    const semGPA = computeGPA(
                      semGroup.items.map((c) => ({
                        grade: resultMap.get((c.courses as any)?.id) || null,
                        credit_units: (c.courses as any)?.credit_units || 0,
                      }))
                    );
                    return (
                      <div key={semGroup.label} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{semGroup.label}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>GPA: <strong className="text-foreground">{semGPA}</strong></span>
                            <span>Credits: <strong className="text-foreground">{semCredits}</strong></span>
                          </div>
                        </div>
                        <div className="bg-card border border-border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {semGroup.items.map((sc) => {
                                const course = sc.courses as any;
                                const grade = resultMap.get(course?.id) || null;
                                return (
                                  <TableRow key={sc.id}>
                                    <TableCell className="font-medium">{course?.code}</TableCell>
                                    <TableCell>{course?.title}</TableCell>
                                    <TableCell>{course?.credit_units}</TableCell>
                                    <TableCell>{course?.level || "—"}</TableCell>
                                    <TableCell className="font-semibold">{grade || "—"}</TableCell>
                                    <TableCell>
                                      <Badge variant={sc.status === "completed" ? "default" : "secondary"}>
                                        {sc.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })
      )}
    </div>
  );
};

export default MyCourses;
