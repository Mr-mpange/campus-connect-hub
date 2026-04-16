import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "admin" | "lecturer" | "student" | "hod";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  studentId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function buildUser(supabaseUser: SupabaseUser): Promise<User> {
  // Fetch role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", supabaseUser.id);

  // Prioritize highest role: admin > hod > lecturer > student
  const rolePriority: Record<string, number> = { admin: 4, hod: 3, lecturer: 2, student: 1 };
  const sortedRoles = (roles || []).sort(
    (a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0)
  );
  const role = (sortedRoles[0]?.role as UserRole) || "student";

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, department_id, student_id")
    .eq("user_id", supabaseUser.id)
    .maybeSingle();

  let departmentName: string | undefined;
  if (profile?.department_id) {
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();
    departmentName = dept?.name ?? undefined;
  }

  return {
    id: supabaseUser.id,
    name: profile?.full_name || supabaseUser.email || "",
    email: supabaseUser.email || "",
    role,
    department: departmentName,
    departmentId: profile?.department_id ?? undefined,
    studentId: profile?.student_id ?? undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer buildUser to avoid deadlock with Supabase auth lock
      if (session?.user) {
        setTimeout(async () => {
          try {
            const u = await buildUser(session.user);
            setUser(u);
          } catch {
            setUser(null);
          }
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const u = await buildUser(session.user);
          setUser(u);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
