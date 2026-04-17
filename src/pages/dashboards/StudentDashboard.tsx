import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import { GraduationCap, BookOpen, Bell, CreditCard, CheckCircle2, Clock } from "lucide-react";

const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function computeGPA(results: { grade: string | null; credit_units: number }[]) {
  let pts = 0, creds = 0;
  results.forEach((r) => {
    if (r.grade && gradePoints[r.grade] !== undefined) {
      pts += gradePoints[r.grade] * r.credit_units;
      creds += r.credit_units;
    }
  });
  return creds > 0 ? (pts / creds).toFixed(2) : "—";
}

const StudentDashboard = () => {
  const { user } = useAuth();

  // Registered courses this semester
  const { data: courses = [] } = useQuery({
    queryKey: ["student-dashboard-courses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("student_courses")
        .select("*, courses:course_id(code, title, credit_units, semester)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Results
  const { data: results = [] } = useQuery({
    queryKey: ["student-dashboard-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("results")
        .select("*, courses:course_id(code, title, credit_units, semester)")
        .eq("student_id", user.id)
        .in("status", ["submitted", "approved", "published"])
        .order("academic_session", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fee balance (pending payments)
  const { data: payments = [] } = useQuery({
    queryKey: ["student-dashboard-payments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status, due_date")
        .eq("student_id", user.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Notices
  const { data: notices = [] } = useQuery({
    queryKey: ["student-dashboard-notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("title, created_at, priority")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const publishedResults = results.filter((r) => r.status === "approved" || r.status === "published");
  const gpa = computeGPA(publishedResults.map((r) => {
    const c = r.courses as any;
    return { grade: r.grade, credit_units: c?.credit_units || 0 };
  }));

  const feeBalance = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const nextDue = payments[0]?.due_date
    ? new Date(payments[0].due_date).toLocaleDateString("en-TZ", { day: "numeric", month: "short" })
    : null;

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.name?.split(" ")[0] || "Student"}`}
        description={`${user?.studentId || ""} · ${user?.department || ""} Department`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Current GPA" value={gpa} icon={GraduationCap} />
        <StatCard title="Enrolled Courses" value={courses.length.toString()} icon={BookOpen} subtitle="Registered" />
        <StatCard title="Results Available" value={publishedResults.length.toString()} icon={CheckCircle2} subtitle={`of ${results.length} courses`} />
        <StatCard
          title="Fee Balance"
          value={feeBalance > 0 ? `TSh ${feeBalance.toLocaleString()}` : "Paid"}
          icon={CreditCard}
          subtitle={nextDue ? `Due: ${nextDue}` : feeBalance > 0 ? "No due date" : "No pending fees"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">My Results</h2>
          </div>
          <div className="overflow-x-auto">
            {results.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No results yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-center p-3 font-medium">Credits</th>
                    <th className="text-center p-3 font-medium">Grade</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r) => {
                    const c = r.courses as any;
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium text-foreground">{c?.code || "—"}</td>
                        <td className="p-3 text-muted-foreground">{c?.title || "—"}</td>
                        <td className="p-3 text-center">{c?.credit_units || "—"}</td>
                        <td className="p-3 text-center font-semibold">{r.grade || "—"}</td>
                        <td className="p-3 text-center">
                          {r.status === "published" || r.status === "approved" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-success bg-success/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> {r.status === "published" ? "Published" : "Approved"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Notices */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Notices</h2>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {notices.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">No notices.</p>
            ) : notices.map((n, i) => (
              <div key={i} className="p-3">
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    n.priority === "urgent" ? "bg-destructive" : "bg-info"
                  }`} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
