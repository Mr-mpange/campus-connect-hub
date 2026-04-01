import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  create_user: "User Created",
  update_user: "User Updated",
  create_department: "Department Created",
  update_department: "Department Updated",
  delete_department: "Department Deleted",
  create_course: "Course Created",
  update_course: "Course Updated",
  delete_course: "Course Deleted",
  upload_results: "Results Uploaded",
  submit_results: "Results Submitted",
  approve_results: "Results Approved",
  reject_results: "Results Rejected",
  publish_results: "Results Published",
};

const actionBadgeVariant = (action: string) => {
  if (action.includes("create") || action.includes("approve") || action.includes("publish")) return "default" as const;
  if (action.includes("delete") || action.includes("reject")) return "destructive" as const;
  return "secondary" as const;
};

const AuditLog = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", actionFilter, dateFrom],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filtered = search
    ? logs.filter((l) =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.table_name?.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(l.new_data)?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div>
      <PageHeader title="Audit Log" description="System activity and change history">
        <Shield className="w-5 h-5 text-muted-foreground" />
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs…" className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit logs found</TableCell></TableRow>
            ) : filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={actionBadgeVariant(log.action)}>
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.table_name || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {log.new_data ? JSON.stringify(log.new_data).slice(0, 80) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AuditLog;
