import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldAlert, Smartphone, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const UssdAnalytics = () => {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ussd-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ussd_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const totalSessions = new Set(sessions.map((s) => s.session_id)).size;
  const uniqueStudents = new Set(sessions.filter((s) => s.student_id).map((s) => s.student_id)).size;
  const failedAuth = sessions.filter(
    (s) => s.response_text?.includes("Incorrect PIN") || s.response_text?.includes("not found") || s.response_text?.includes("PIN not set")
  ).length;
  const todaySessions = new Set(
    sessions.filter((s) => new Date(s.created_at) >= startOfDay(new Date())).map((s) => s.session_id)
  ).size;

  // Menu popularity
  const menuCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.menu_selection && s.menu_selection !== "main_menu") {
      menuCounts[s.menu_selection] = (menuCounts[s.menu_selection] || 0) + 1;
    }
  });
  const menuData = Object.entries(menuCounts)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  // Daily trend (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = new Set(
      sessions
        .filter((s) => new Date(s.created_at) >= dayStart && new Date(s.created_at) < dayEnd)
        .map((s) => s.session_id)
    ).size;
    return { day: format(date, "EEE"), sessions: count };
  });

  // Failed auth breakdown
  const failedTypes = {
    "ID Not Found": sessions.filter((s) => s.response_text?.includes("not found")).length,
    "Wrong PIN": sessions.filter((s) => s.response_text?.includes("Incorrect PIN")).length,
    "PIN Not Set": sessions.filter((s) => s.response_text?.includes("PIN not set")).length,
  };
  const failedData = Object.entries(failedTypes)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="USSD Analytics" description="Usage trends, popular menus, and authentication insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Sessions" value={totalSessions} icon={Smartphone} />
        <StatCard title="Today's Sessions" value={todaySessions} icon={Activity} />
        <StatCard title="Unique Students" value={uniqueStudents} icon={TrendingUp} />
        <StatCard title="Failed Auth" value={failedAuth} icon={ShieldAlert} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Sessions (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Menu Popularity */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Popular Menu Items</CardTitle></CardHeader>
          <CardContent>
            {menuData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No menu data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={menuData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Failed Auth Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Failed Authentication Breakdown</CardTitle></CardHeader>
        <CardContent>
          {failedData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No failed attempts recorded</p>
          ) : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={failedData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {failedData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {failedData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm">{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UssdAnalytics;
