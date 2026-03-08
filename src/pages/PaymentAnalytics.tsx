import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Banknote, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(152, 55%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(205, 80%, 50%)",
];

const chartConfig = {
  value: { label: "Amount", color: "hsl(var(--primary))" },
  paid: { label: "Collected", color: "hsl(152, 55%, 40%)" },
  pending: { label: "Outstanding", color: "hsl(38, 92%, 50%)" },
  count: { label: "Count", color: "hsl(205, 80%, 50%)" },
};

const PaymentAnalytics = () => {
  const { data: payments = [] } = useQuery({
    queryKey: ["payment-analytics-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalBilled = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalOutstanding = payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : "0";

  // By payment type
  const byType = payments.reduce<Record<string, { paid: number; pending: number }>>((acc, p) => {
    const key = p.payment_type;
    if (!acc[key]) acc[key] = { paid: 0, pending: 0 };
    if (p.status === "paid") acc[key].paid += Number(p.amount);
    else if (p.status === "pending") acc[key].pending += Number(p.amount);
    return acc;
  }, {});
  const typeData = Object.entries(byType).map(([name, v]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), ...v }));

  // Status distribution
  const statusCounts = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Monthly trends
  const monthly = payments.reduce<Record<string, { paid: number; pending: number }>>((acc, p) => {
    const month = p.created_at.slice(0, 7);
    if (!acc[month]) acc[month] = { paid: 0, pending: 0 };
    if (p.status === "paid") acc[month].paid += Number(p.amount);
    else acc[month].pending += Number(p.amount);
    return acc;
  }, {});
  const monthlyData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // By session
  const bySess = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.academic_session] = (acc[p.academic_session] || 0) + Number(p.amount);
    return acc;
  }, {});
  const sessionData = Object.entries(bySess).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="Payment Analytics" description="Collection rates, trends, and outstanding balances" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Billed" value={`TZS ${totalBilled.toLocaleString()}`} icon={Banknote} />
        <StatCard title="Total Collected" value={`TZS ${totalCollected.toLocaleString()}`} icon={CheckCircle2} />
        <StatCard title="Outstanding" value={`TZS ${totalOutstanding.toLocaleString()}`} icon={AlertTriangle} />
        <StatCard title="Collection Rate" value={`${collectionRate}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Payment Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Payment Type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="paid" fill="hsl(152, 55%, 40%)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pending" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Collection Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="paid" stroke="hsl(152, 55%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pending" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* By Academic Session */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Academic Session</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={sessionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
