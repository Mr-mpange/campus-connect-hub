import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, BookOpen, TrendingUp, CheckCircle2, Clock } from "lucide-react";

function computeGPA(results: { score: number | null; grade: string | null; credit_units: number }[]): string {
  const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  let totalPoints = 0;
  let totalCredits = 0;
  results.forEach((r) => {
    if (r.grade && gradePoints[r.grade] !== undefined) {
      totalPoints += gradePoints[r.grade] * r.credit_units;
      totalCredits += r.credit_units;
    }
  });
  return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "—";
}

const MyResults = () => {
  const { user } = useAuth();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("results")
        .select("*, courses:course_id(code, title, credit_units)")
        .eq("student_id", user.id)
        .in("status", ["approved", "published"])
        .order("academic_session", { ascending: false });
      if (error) throw error;
      return data.map((r) => {
        const course = r.courses as { code: string; title: string; credit_units: number } | null;
        return {
          ...r,
          courseCode: course?.code || "",
          courseTitle: course?.title || "",
          creditUnits: course?.credit_units || 0,
        };
      });
    },
    enabled: !!user,
  });

  const publishedResults = results.filter((r) => r.status === "published");
  const gpa = computeGPA(publishedResults.map((r) => ({ score: r.score, grade: r.grade, credit_units: r.creditUnits })));
  const totalCredits = publishedResults.reduce((sum, r) => sum + r.creditUnits, 0);

  // Group by session
  const sessions = new Map<string, typeof results>();
  results.forEach((r) => {
    if (!sessions.has(r.academic_session)) sessions.set(r.academic_session, []);
    sessions.get(r.academic_session)!.push(r);
  });

  return (
    <div>
      <PageHeader title="My Results" description="View your academic results and transcript" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Cumulative GPA" value={gpa} icon={GraduationCap} />
        <StatCard title="Total Credits" value={totalCredits.toString()} icon={BookOpen} />
        <StatCard title="Courses Completed" value={publishedResults.length.toString()} icon={TrendingUp} />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading results…</p>
      ) : results.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No results available yet.
        </div>
      ) : (
        Array.from(sessions.entries()).map(([session, sessionResults]) => (
          <div key={session} className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">{session}</h3>
            <div className="bg-card border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionResults.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.courseCode}</TableCell>
                      <TableCell>{r.courseTitle}</TableCell>
                      <TableCell>{r.creditUnits}</TableCell>
                      <TableCell>{r.score ?? "—"}</TableCell>
                      <TableCell className="font-semibold">{r.grade || "—"}</TableCell>
                      <TableCell>
                        {r.status === "published" ? (
                          <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Published</Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Approved</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyResults;
