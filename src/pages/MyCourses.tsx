import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, TrendingUp } from "lucide-react";

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
      <PageHeader title="My Courses" description="View your registered courses by year of study with GPA" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Cumulative GPA" value={allGPA} icon={GraduationCap} />
        <StatCard title="Total Courses" value={studentCourses.length.toString()} icon={BookOpen} />
        <StatCard title="Total Credits" value={totalCredits.toString()} icon={TrendingUp} />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading courses…</p>
      ) : studentCourses.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No courses registered yet. Contact your department for course registration.
        </div>
      ) : (
        Array.from(grouped.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, courses]) => {
            // Split by semester
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
