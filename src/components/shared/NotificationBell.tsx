import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, CreditCard, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  message: string;
  type: "payment_confirmed" | "payment_created";
  timestamp: string;
  read: boolean;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user || user.role !== "student") return;

    const channel = supabase
      .channel("student-payment-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow.status === "paid") {
            const n: Notification = {
              id: newRow.id + "-paid",
              message: `Payment of TZS ${Number(newRow.amount).toLocaleString()} confirmed (${newRow.control_number})`,
              type: "payment_confirmed",
              timestamp: new Date().toISOString(),
              read: false,
            };
            setNotifications((prev) => [n, ...prev].slice(0, 20));
            qc.invalidateQueries({ queryKey: ["my-payments"] });
            qc.invalidateQueries({ queryKey: ["my-receipts"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          const n: Notification = {
            id: newRow.id + "-created",
            message: `Control number ${newRow.control_number} generated — TZS ${Number(newRow.amount).toLocaleString()}`,
            type: "payment_created",
            timestamp: new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => [n, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  if (!user || user.role !== "student") return null;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {notifications.length > 0 && (
            <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 p-3 border-b border-border last:border-0 transition-colors",
                  !n.read && "bg-accent/30"
                )}
              >
                {n.type === "payment_confirmed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <CreditCard className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
