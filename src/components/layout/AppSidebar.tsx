import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Bell,
  Settings,
  Building2,
  ClipboardCheck,
  GraduationCap,
  BarChart3,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Library,
  UserCheck,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "lecturer", "student", "hod"] },
  { label: "Departments", icon: Building2, path: "/departments", roles: ["admin"] },
  { label: "Users", icon: Users, path: "/users", roles: ["admin"] },
  { label: "Courses", icon: BookOpen, path: "/courses", roles: ["admin", "lecturer", "hod"] },
  { label: "Results", icon: FileText, path: "/results", roles: ["admin", "lecturer"] },
  { label: "Approvals", icon: ClipboardCheck, path: "/approvals", roles: ["admin"] },
  { label: "Lecturer Assignment", icon: UserCheck, path: "/lecturer-assignment", roles: ["hod"] },
  { label: "My Courses", icon: Library, path: "/my-courses", roles: ["student"] },
  { label: "My Results", icon: GraduationCap, path: "/my-results", roles: ["student"] },
  { label: "Payments", icon: CreditCard, path: "/payments", roles: ["student"] },
  { label: "Payment Verification", icon: CreditCard, path: "/payment-verification", roles: ["admin"] },
  { label: "Notices", icon: Bell, path: "/notices", roles: ["admin", "student", "hod"] },
  { label: "Analytics", icon: BarChart3, path: "/analytics", roles: ["admin"] },
  { label: "Audit Log", icon: Shield, path: "/audit-log", roles: ["admin"] },
  { label: "USSD Simulator", icon: Smartphone, path: "/ussd-simulator", roles: ["admin"] },
  { label: "Settings", icon: Settings, path: "/settings", roles: ["admin", "lecturer", "student", "hod"] },
];

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const roleLabel = user.role === "admin" ? "Administrator" : user.role === "hod" ? "Head of Dept." : user.role === "lecturer" ? "Lecturer" : "Student";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">UniSIMS</h1>
            <p className="text-[10px] text-sidebar-muted truncate">Student Information System</p>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className={cn("px-4 py-3 border-b border-sidebar-border", collapsed && "px-2 py-3")}>
        {collapsed ? (
          <div className="w-9 h-9 mx-auto rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground">
            {user.name.split(" ").map(n => n[0]).join("")}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground flex-shrink-0">
              {user.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[11px] text-sidebar-muted">{roleLabel}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
