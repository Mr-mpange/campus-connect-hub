import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, BookOpen, TrendingUp, CheckCircle2, Clock, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function computeGPA(results: { grade: string | null; credit_units: number }[]): string {
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
        .select("*, courses:course_id(code, title, credit_units, semester)")
        .eq("student_id", user.id)
        .in("status", ["submitted", "approved", "published"])
        .order("academic_session", { ascending: false });
      if (error) throw error;
      return data.map((r) => {
        const course = r.courses as { code: string; title: string; credit_units: number; semester: string | null } | null;
        return {
          ...r,
          courseCode: course?.code || "",
          courseTitle: course?.title || "",
          creditUnits: course?.credit_units || 0,
          semester: course?.semester || "1",
        };
      });
    },
    enabled: !!user,
  });

  const publishedResults = results.filter((r) => r.status === "published" || r.status === "approved");
  const cumulativeGPA = computeGPA(publishedResults.map((r) => ({ grade: r.grade, credit_units: r.creditUnits })));
  const totalCredits = publishedResults.reduce((sum, r) => sum + r.creditUnits, 0);

  // Group by session then semester
  const grouped = new Map<string, Map<string, typeof results>>();
  results.forEach((r) => {
    const session = r.academic_session;
    const sem = r.semester;
    if (!grouped.has(session)) grouped.set(session, new Map());
    const semMap = grouped.get(session)!;
    if (!semMap.has(sem)) semMap.set(sem, []);
    semMap.get(sem)!.push(r);
  });

  const downloadTranscript = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Academic Transcript", 14, 20);
    doc.setFontSize(10);
    doc.text(`Student: ${user?.name || ""}`, 14, 28);
    doc.text(`Student ID: ${user?.studentId || "N/A"}`, 14, 34);
    doc.text(`Department: ${user?.department || "N/A"}`, 14, 40);
    doc.text(`Cumulative GPA: ${cumulativeGPA}`, 14, 46);
    doc.text(`Total Credits: ${totalCredits}`, 14, 52);

    let yOffset = 60;
    Array.from(grouped.entries()).forEach(([session, semMap]) => {
      Array.from(semMap.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([sem, semResults]) => {
        const semGPA = computeGPA(semResults.map((r) => ({ grade: r.grade, credit_units: r.creditUnits })));
        doc.setFontSize(11);
        doc.text(`${session} — Semester ${sem} (GPA: ${semGPA})`, 14, yOffset);
        yOffset += 4;

        autoTable(doc, {
          startY: yOffset,
          head: [["Code", "Title", "Credits", "Score", "Grade"]],
          body: semResults.map((r) => [r.courseCode, r.courseTitle, r.creditUnits, r.score ?? "—", r.grade || "—"]),
          theme: "grid",
          styles: { fontSize: 8 },
          margin: { left: 14 },
        });

        yOffset = (doc as any).lastAutoTable.finalY + 10;
        if (yOffset > 260) {
          doc.addPage();
          yOffset = 20;
        }
      });
    });

    doc.save(`transcript-${user?.name?.replace(/\s+/g, "_") || "student"}.pdf`);
  };

  return (
    <div>
      <PageHeader title="My Results" description="View your academic results, semester GPAs, and transcript">
        {results.length > 0 && (
          <Button size="sm" className="gap-2" onClick={downloadTranscript}>
            <Download className="w-4 h-4" /> Download Transcript
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Cumulative GPA" value={cumulativeGPA} icon={GraduationCap} />
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
        Array.from(grouped.entries()).map(([session, semMap]) => (
          <div key={session} className="mb-8">
            <h3 className="text-sm font-bold text-foreground mb-3">{session}</h3>
            {Array.from(semMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([sem, semResults]) => {
              const semGPA = computeGPA(semResults.map((r) => ({ grade: r.grade, credit_units: r.creditUnits })));
              const semCredits = semResults.reduce((s, r) => s + r.creditUnits, 0);
              return (
                <div key={sem} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Semester {sem}
                    </h4>
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
                          <TableHead>T1 (20%)</TableHead>
                          <TableHead>IA (15%)</TableHead>
                          <TableHead>GA (15%)</TableHead>
                          <TableHead>CW</TableHead>
                          <TableHead>UE (50%)</TableHead>
                          <TableHead>Final</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semResults.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.courseCode}</TableCell>
                            <TableCell>{r.courseTitle}</TableCell>
                            <TableCell>{r.creditUnits}</TableCell>
                            <TableCell>{r.test1_score ?? "—"}</TableCell>
                            <TableCell>{r.individual_assignment ?? "—"}</TableCell>
                            <TableCell>{r.group_assignment ?? "—"}</TableCell>
                            <TableCell>{r.coursework_total != null ? Number(r.coursework_total).toFixed(1) : "—"}</TableCell>
                            <TableCell>{r.university_exam ?? "—"}</TableCell>
                            <TableCell className="font-semibold">{r.score ?? "—"}</TableCell>
                            <TableCell className="font-semibold">{r.grade || "—"}</TableCell>
                            <TableCell>
                              {r.status === "published" ? (
                                <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Published</Badge>
                              ) : r.status === "approved" ? (
                                <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending Approval</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

export default MyResults;
