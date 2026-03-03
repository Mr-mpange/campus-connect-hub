import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;

interface UserForm {
  full_name: string;
  email: string;
  password: string;
  role: AppRole;
  department_id: string;
  student_id: string;
  phone: string;
}

const emptyForm: UserForm = { full_name: "", email: "", password: "", role: "student", department_id: "", student_id: "", phone: "" };

const UserManagement = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, departments:department_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch roles for all users
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      return profiles.map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) || "student",
        departmentName: (p.departments as { name: string } | null)?.name || null,
      }));
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      // Create user via edge function for admin user creation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role,
          department_id: values.department_id || null,
          student_id: values.student_id || null,
          phone: values.phone || null,
        },
      });
      if (res.error) throw new Error(res.error.message || "Failed to create user");
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      toast.success("User created successfully");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active: !isActive }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      toast.success("User status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(form);
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "hod": return "outline" as const;
      case "lecturer": return "default" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div>
      <PageHeader title="User Management" description="Create, assign, and manage system users">
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </PageHeader>

      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge></TableCell>
                <TableCell>{u.departmentName || "—"}</TableCell>
                <TableCell><Badge variant={u.is_active ? "default" : "secondary"}>{u.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => toggleActiveMutation.mutate({ userId: u.user_id, isActive: u.is_active })} title={u.is_active ? "Deactivate" : "Activate"}>
                    <UserCog className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="hod">Head of Department</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === "student" && (
              <div className="space-y-1.5">
                <Label>Student ID</Label>
                <Input value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="e.g. CSC/2023/001" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createUserMutation.isPending}>{createUserMutation.isPending ? "Creating…" : "Create User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
