import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import { Users, BookOpen, FileText, Building2, ClipboardCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const recentActivity = [
  { action: "Results submitted", user: "Prof. Amina Yusuf", course: "CSC 301", time: "2 mins ago", status: "pending" },
  { action: "Results approved", user: "Admin", course: "MTH 201", time: "15 mins ago", status: "approved" },
  { action: "New student registered", user: "David Mwangi", course: "—", time: "1 hour ago", status: "info" },
  { action: "Results rejected", user: "Admin", course: "ENG 101", time: "2 hours ago", status: "rejected" },
  { action: "Bulk upload completed", user: "Dr. Kwame Asante", course: "PHY 102", time: "3 hours ago", status: "pending" },
];

const pendingApprovals = [
  { course: "CSC 301 — Data Structures", lecturer: "Prof. Amina Yusuf", students: 145, submitted: "10 mins ago" },
  { course: "CSC 205 — Algorithms", lecturer: "Dr. Kwame Asante", students: 98, submitted: "1 hour ago" },
  { course: "MTH 301 — Linear Algebra", lecturer: "Dr. Fatima Bello", students: 112, submitted: "3 hours ago" },
];

const statusColor: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
};

const AdminDashboard = () => (
  <div>
    <PageHeader title="Admin Dashboard" description="System overview and management controls" />

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard title="Total Students" value="2,438" icon={Users} trend={{ value: "12% this semester", positive: true }} />
      <StatCard title="Departments" value="12" icon={Building2} subtitle="3 new this year" />
      <StatCard title="Active Courses" value="186" icon={BookOpen} trend={{ value: "8 added", positive: true }} />
      <StatCard title="Pending Approvals" value="7" icon={ClipboardCheck} subtitle="3 urgent" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pending Approvals */}
      <div className="lg:col-span-2 bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Pending Result Approvals</h2>
          <Badge variant="outline" className="text-xs">{pendingApprovals.length} pending</Badge>
        </div>
        <div className="divide-y divide-border">
          {pendingApprovals.map((item, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{item.course}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.lecturer} · {item.students} students</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.submitted}</span>
                <div className="flex gap-1.5">
                  <button className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((item, i) => (
            <div key={i} className="p-3 flex items-start gap-3">
              <div className="mt-0.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{item.action}</p>
                <p className="text-[11px] text-muted-foreground">{item.user} · {item.course}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor[item.status]}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
