import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import NotificationBell from "@/components/shared/NotificationBell";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const DashboardLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Mobile sidebar sheet */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <main className={isMobile ? "" : "ml-[260px] transition-all duration-300"}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-1">
          <div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
          </div>
          <NotificationBell />
        </div>
        <div className="p-4 sm:p-6 pt-2 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
