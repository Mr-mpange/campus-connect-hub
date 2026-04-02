import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import { Users, BookOpen, Building2, ClipboardCheck, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, departments, courses, pendingResults] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("results").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      ]);
      return {
        students: students.count || 0,
        departments: departments.count || 0,
        courses: courses.count || 0,
        pending: pendingResults.count || 0,
      };
    },
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["admin-pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("id, course_id, lecturer_id, academic_session, submitted_at, student_id")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Group by course_id + lecturer_id
      const grouped = new Map<string, { courseId: string; lecturerId: string; session: string; studentCount: number; submittedAt: string }>();
      for (const r of data) {
        const key = `${r.course_id}-${r.lecturer_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, { courseId: r.course_id, lecturerId: r.lecturer_id, session: r.academic_session, studentCount: 0, submittedAt: r.submitted_at || "" });
        }
        grouped.get(key)!.studentCount++;
      }

      const entries = [...grouped.values()];
      if (entries.length === 0) return [];

      const courseIds = [...new Set(entries.map((e) => e.courseId))];
      const lecturerIds = [...new Set(entries.map((e) => e.lecturerId))];

      const [coursesRes, profilesRes] = await Promise.all([
        supabase.from("courses").select("id, code, title").in("id", courseIds),
        supabase.from("profiles").select("user_id, full_name").in("user_id", lecturerIds),
      ]);

      const courseMap = new Map((coursesRes.data || []).map((c) => [c.id, c]));
      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));

      return entries.map((e) => ({
        course: courseMap.get(e.courseId),
        lecturer: profileMap.get(e.lecturerId),
        students: e.studentCount,
        submittedAt: e.submittedAt,
      }));
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;

      const userIds = [...new Set((data || []).map((a) => a.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds as string[]);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      return (data || []).map((a) => ({
        action: a.action,
        user: profileMap.get(a.user_id || "") || "System",
        table: a.table_name || "",
        time: getRelativeTime(a.created_at),
      }));
    },
  });

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="System overview and management controls" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={(stats?.students || 0).toString()} icon={Users} />
        <StatCard title="Departments" value={(stats?.departments || 0).toString()} icon={Building2} />
        <StatCard title="Active Courses" value={(stats?.courses || 0).toString()} icon={BookOpen} />
        <StatCard title="Pending Approvals" value={(stats?.pending || 0).toString()} icon={ClipboardCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pending Result Approvals</h2>
            <Badge variant="outline" className="text-xs">{pendingApprovals.length} pending</Badge>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No pending approvals</div>
          ) : (
            <div className="divide-y divide-border">
              {pendingApprovals.map((item, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.course?.code} — {item.course?.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.lecturer?.full_name} · {item.students} students
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{getRelativeTime(item.submittedAt)}</span>
                    <button
                      onClick={() => navigate("/approvals")}
                      className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No recent activity</div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((item, i) => (
                <div key={i} className="p-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.action}</p>
                    <p className="text-[11px] text-muted-foreground">{item.user} · {item.table}</p>
                    <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default AdminDashboard;
