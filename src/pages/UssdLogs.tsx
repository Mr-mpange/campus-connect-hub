import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const UssdLogs = () => {
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ussd-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ussd_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const filtered = search
    ? logs.filter(
        (l) =>
          l.student_id?.toLowerCase().includes(search.toLowerCase()) ||
          l.phone_number?.toLowerCase().includes(search.toLowerCase()) ||
          l.session_id?.toLowerCase().includes(search.toLowerCase()) ||
          l.response_text?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const menuBadge = (menu: string | null) => {
    if (!menu) return null;
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      results: "default",
      payments: "secondary",
      courses: "outline",
      notices: "destructive",
      main_menu: "secondary",
      exit: "outline",
    };
    return <Badge variant={colors[menu] || "secondary"}>{menu}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="USSD Session Logs"
        description="View history of all USSD interactions by students"
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student ID, phone, or content…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Menu</TableHead>
                <TableHead>Input</TableHead>
                <TableHead className="max-w-[300px]">Response</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No USSD logs found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.student_id || "—"}</TableCell>
                    <TableCell className="text-xs">{log.phone_number || "—"}</TableCell>
                    <TableCell>{menuBadge(log.menu_selection)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.request_text || "—"}</TableCell>
                    <TableCell className="max-w-[300px] text-xs truncate" title={log.response_text}>
                      {log.response_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.session_ended ? "secondary" : "default"}>
                        {log.session_ended ? "Ended" : "Active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default UssdLogs;
