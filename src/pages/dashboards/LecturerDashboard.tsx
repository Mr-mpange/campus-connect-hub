import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import { BookOpen, FileText, Users, Upload, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  submitted: { label: "Submitted", className: "bg-info/15 text-info border-info/30", icon: Upload },
  approved: { label: "Approved", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

const LecturerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch allocated courses
  const { data: allocations = [] } = useQuery({
    queryKey: ["lecturer-allocations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("course_allocations")
        .select("*, courses:course_id(id, code, title, credit_units)")
        .eq("lecturer_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all results for this lecturer
  const { data: results = [] } = useQuery({
    queryKey: ["lecturer-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("results")
        .select("course_id, status, student_id")
        .eq("lecturer_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build course stats
  const courseStats = allocations.map((a) => {
    const course = a.courses as { id: string; code: string; title: string; credit_units: number } | null;
    if (!course) return null;
    const courseResults = results.filter((r) => r.course_id === course.id);
    const studentCount = new Set(courseResults.map((r) => r.student_id)).size;
    const hasSubmitted = courseResults.some((r) => r.status === "submitted");
    const hasApproved = courseResults.some((r) => r.status === "approved" || r.status === "published");
    const hasDraft = courseResults.some((r) => r.status === "draft");

    let status = "not_started";
    let progress = 0;
    if (hasApproved) { status = "approved"; progress = 100; }
    else if (hasSubmitted) { status = "submitted"; progress = 100; }
    else if (hasDraft) { status = "draft"; progress = 72; }

    return { code: course.code, title: course.title, students: studentCount, status, progress, id: course.id };
  }).filter(Boolean) as { code: string; title: string; students: number; status: string; progress: number; id: string }[];

  const totalStudents = new Set(results.map((r) => r.student_id)).size;
  const submittedCourses = new Set(
    results.filter((r) => ["submitted", "approved", "published"].includes(r.status)).map((r) => r.course_id)
  ).size;
  const pendingCourses = new Set(
    results.filter((r) => r.status === "submitted").map((r) => r.course_id)
  ).size;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ").pop()}`}
        description={`${user?.department || ""} Department · Semester Results Management`}
      >
        <Button size="sm" className="gap-2" onClick={() => navigate("/results")}>
          <Upload className="w-4 h-4" /> Upload Results
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="My Courses" value={allocations.length.toString()} icon={BookOpen} subtitle="This semester" />
        <StatCard title="Total Students" value={totalStudents.toString()} icon={Users} />
        <StatCard title="Results Submitted" value={submittedCourses.toString()} icon={FileText} subtitle={`of ${allocations.length} courses`} />
        <StatCard title="Pending Approval" value={pendingCourses.toString()} icon={Clock} />
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">My Courses — Result Status</h2>
        </div>
        {courseStats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No courses allocated yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {courseStats.map((course) => {
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
                  <Button variant="outline" size="sm" className="text-xs flex-shrink-0" onClick={() => navigate("/results")}>
                    {course.status === "not_started" ? "Start" : course.status === "draft" ? "Continue" : "View"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;
