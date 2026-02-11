import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Bell, AlertTriangle, Info, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

const priorityConfig: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  urgent: { icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20", label: "Urgent" },
  important: { icon: Megaphone, className: "bg-warning/10 text-warning border-warning/20", label: "Important" },
  info: { icon: Info, className: "bg-info/10 text-info border-info/20", label: "Info" },
};

interface NoticeForm {
  title: string;
  content: string;
  priority: string;
  target_role: string;
}

const emptyForm: NoticeForm = { title: "", content: "", priority: "info", target_role: "all" };

const Notices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NoticeForm>(emptyForm);

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: NoticeForm) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");
      const { error } = await supabase.from("notices").insert({
        title: values.title,
        content: values.content,
        priority: values.priority,
        target_role: values.target_role === "all" ? null : values.target_role,
        created_by: authUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
      toast.success("Notice published");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
      toast.success("Notice removed");
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter notices for non-admin users by target_role
  const visibleNotices = isAdmin
    ? notices
    : notices.filter((n) => !n.target_role || n.target_role === user?.role);

  return (
    <div>
      <PageHeader title="Notices" description="Important announcements and notifications">
        {isAdmin && (
          <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Post Notice
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : visibleNotices.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No notices at this time.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotices.map((n) => {
            const config = priorityConfig[n.priority] || priorityConfig.info;
            const Icon = config.icon;
            return (
              <Card key={n.id} className={`border ${config.className}`}>
                <CardHeader className="pb-2 flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <CardTitle className="text-sm">{n.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                    {n.target_role && <Badge variant="secondary" className="text-[10px]">{n.target_role}</Badge>}
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(n.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 whitespace-pre-line">{n.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Notice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Notice</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Audience</Label>
                <Select value={form.target_role} onValueChange={(v) => setForm({ ...form, target_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="student">Students Only</SelectItem>
                    <SelectItem value="lecturer">Lecturers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Posting…" : "Post"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notices;
