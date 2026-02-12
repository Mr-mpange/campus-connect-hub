import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ResponsiveContainer } from "recharts";
import { Users, BookOpen, FileText, Building2, TrendingUp, CheckCircle2 } from "lucide-react";

const CHART_COLORS = [
  "hsl(175, 55%, 35%)",
  "hsl(215, 65%, 28%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(205, 80%, 50%)",
  "hsl(152, 55%, 40%)",
];

const Analytics = () => {
  const { data: stats } = useQuery({
    queryKey: ["analytics-stats"],
    queryFn: async () => {
      const [
        { count: totalStudents },
        { count: totalLecturers },
        { count: totalCourses },
        { count: totalDepts },
      ] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "lecturer"),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("departments").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        students: totalStudents || 0,
        lecturers: totalLecturers || 0,
        courses: totalCourses || 0,
        departments: totalDepts || 0,
      };
    },
  });

  const { data: resultsByStatus = [] } = useQuery({
    queryKey: ["analytics-results-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("results").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((r) => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: resultsByDept = [] } = useQuery({
    queryKey: ["analytics-results-dept"],
    queryFn: async () => {
      const { data: results, error } = await supabase
        .from("results")
        .select("course_id, courses:course_id(department_id, departments:department_id(name))");
      if (error) throw error;

      const counts: Record<string, number> = {};
      results.forEach((r) => {
        const course = r.courses as { department_id: string; departments: { name: string } | null } | null;
        const deptName = course?.departments?.name || "Unknown";
        counts[deptName] = (counts[deptName] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/\.$/, ""), value }));
    },
  });

  const { data: gradeDistribution = [] } = useQuery({
    queryKey: ["analytics-grades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("grade")
        .in("status", ["approved", "published"])
        .not("grade", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((r) => {
        if (r.grade) counts[r.grade] = (counts[r.grade] || 0) + 1;
      });
      return ["A", "B", "C", "D", "E", "F"]
        .filter((g) => counts[g])
        .map((name) => ({ name, value: counts[name] }));
    },
  });

  const { data: monthlyTrends = [] } = useQuery({
    queryKey: ["analytics-monthly"],
    queryFn: async () => {
      const { data, error } = await supabase.from("results").select("created_at, status");
      if (error) throw error;
      const months: Record<string, { submitted: number; approved: number }> = {};
      data.forEach((r) => {
        const month = r.created_at.slice(0, 7);
        if (!months[month]) months[month] = { submitted: 0, approved: 0 };
        if (r.status === "submitted" || r.status === "draft") months[month].submitted++;
        if (r.status === "approved" || r.status === "published") months[month].approved++;
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, counts]) => ({ month, ...counts }));
    },
  });

  const chartConfig = {
    value: { label: "Count", color: "hsl(175, 55%, 35%)" },
    submitted: { label: "Submitted", color: "hsl(205, 80%, 50%)" },
    approved: { label: "Approved", color: "hsl(152, 55%, 40%)" },
  };

  return (
    <div>
      <PageHeader title="Analytics" description="System usage and academic performance analytics" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={stats?.students ?? "—"} icon={Users} />
        <StatCard title="Lecturers" value={stats?.lecturers ?? "—"} icon={Users} />
        <StatCard title="Active Courses" value={stats?.courses ?? "—"} icon={BookOpen} />
        <StatCard title="Departments" value={stats?.departments ?? "—"} icon={Building2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Results by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Results by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {resultsByStatus.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie data={resultsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {resultsByStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No result data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(175, 55%, 35%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No grade data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results by Department */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Results by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {resultsByDept.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={resultsByDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(215, 65%, 28%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No department data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Submission Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrends.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="submitted" stroke="hsl(205, 80%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="approved" stroke="hsl(152, 55%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No trend data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
