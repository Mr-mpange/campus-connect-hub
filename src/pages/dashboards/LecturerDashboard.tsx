import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import { BookOpen, FileText, Users, Upload, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const myCourses = [
  { code: "CSC 301", title: "Data Structures & Algorithms", students: 145, status: "draft", progress: 72 },
  { code: "CSC 205", title: "Introduction to Algorithms", students: 98, status: "submitted", progress: 100 },
  { code: "CSC 401", title: "Software Engineering", students: 67, status: "approved", progress: 100 },
  { code: "CSC 103", title: "Introduction to Programming", students: 210, status: "not_started", progress: 0 },
];

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  submitted: { label: "Submitted", className: "bg-info/15 text-info border-info/30", icon: Upload },
  approved: { label: "Approved", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

const LecturerDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ").pop()}`}
        description={`${user?.department} Department · Semester Results Management`}
      >
        <Button size="sm" className="gap-2">
          <Upload className="w-4 h-4" /> Upload Results
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="My Courses" value="4" icon={BookOpen} subtitle="This semester" />
        <StatCard title="Total Students" value="520" icon={Users} />
        <StatCard title="Results Submitted" value="2" icon={FileText} subtitle="of 4 courses" />
        <StatCard title="Pending Approval" value="1" icon={Clock} />
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">My Courses — Result Status</h2>
        </div>
        <div className="divide-y divide-border">
          {myCourses.map((course) => {
            const cfg = statusConfig[course.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={course.code} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{course.code}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${cfg.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{course.title}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{course.students} students</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={course.progress} className="w-20 h-1.5" />
                    <span className="text-[11px] text-muted-foreground">{course.progress}%</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs flex-shrink-0">
                  {course.status === "not_started" ? "Start" : course.status === "draft" ? "Continue" : "View"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
