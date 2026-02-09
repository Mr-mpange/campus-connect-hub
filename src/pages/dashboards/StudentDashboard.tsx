import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import { GraduationCap, BookOpen, Bell, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const myResults = [
  { code: "CSC 301", title: "Data Structures", grade: "A", credits: 3, status: "published" },
  { code: "MTH 201", title: "Calculus II", grade: "B+", credits: 4, status: "published" },
  { code: "CSC 205", title: "Algorithms", grade: "—", credits: 3, status: "pending" },
  { code: "ENG 101", title: "Technical Writing", grade: "A-", credits: 2, status: "published" },
  { code: "PHY 102", title: "Physics II", grade: "—", credits: 3, status: "pending" },
];

const notices = [
  { title: "Semester Registration Deadline", date: "Feb 15, 2026", type: "urgent" },
  { title: "CSC 301 Results Published", date: "Feb 8, 2026", type: "result" },
  { title: "Library Access — Extended Hours", date: "Feb 5, 2026", type: "info" },
];

const gradeColor: Record<string, string> = {
  A: "text-success font-bold",
  "A-": "text-success font-semibold",
  "B+": "text-info font-semibold",
  "—": "text-muted-foreground",
};

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.name?.split(" ")[0]}`}
        description={`${user?.studentId} · ${user?.department} Department`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Current GPA" value="3.72" icon={GraduationCap} trend={{ value: "0.15 from last sem", positive: true }} />
        <StatCard title="Enrolled Courses" value="5" icon={BookOpen} subtitle="This semester" />
        <StatCard title="Results Available" value="3" icon={CheckCircle2} subtitle="of 5 courses" />
        <StatCard title="Fee Balance" value="₦45,000" icon={CreditCard} subtitle="Due: Mar 1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">My Results — Current Semester</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Course</th>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-center p-3 font-medium">Credits</th>
                  <th className="text-center p-3 font-medium">Grade</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myResults.map((r) => (
                  <tr key={r.code} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{r.code}</td>
                    <td className="p-3 text-muted-foreground">{r.title}</td>
                    <td className="p-3 text-center">{r.credits}</td>
                    <td className={`p-3 text-center ${gradeColor[r.grade] || ""}`}>{r.grade}</td>
                    <td className="p-3 text-center">
                      {r.status === "published" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notices */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Notices</h2>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {notices.map((n, i) => (
              <div key={i} className="p-3">
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    n.type === "urgent" ? "bg-destructive" : n.type === "result" ? "bg-success" : "bg-info"
                  }`} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.date}</p>
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
