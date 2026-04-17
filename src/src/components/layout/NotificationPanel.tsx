import { useState } from "react";
import { MOCK_NOTIFICATIONS } from "../../lib/mockExtended";
import {
  Bell,
  CheckSquare,
  FileSearch,
  ShieldAlert,
  ServerCog,
  Briefcase,
  X,
  Check,
} from "lucide-react";

const typeIcon: Record<string, any> = {
  approval: CheckSquare,
  ocr: FileSearch,
  case: ShieldAlert,
  system: ServerCog,
  work: Briefcase,
};
export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));

  const typeColor: Record<string, string> = {
    approval: "text-chart-3 bg-chart-3/10",
    ocr: "text-primary bg-primary/10",
    case: "text-destructive bg-destructive/10",
    system: "text-chart-2 bg-chart-2/10",
    work: "text-muted-foreground bg-secondary",
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3
          className="text-sm text-popover-foreground"
          style={{ fontWeight: 700 }}
        >
          Notifications{" "}
          {unread > 0 && (
            <span className="text-xs text-primary ml-1">({unread} new)</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No notifications
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = typeIcon[n.type] || Bell;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 border-b border-border/20 hover:bg-muted/50 cursor-pointer transition-colors ${!n.read ? "bg-muted/20" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg ${typeColor[n.type] || "text-muted-foreground bg-secondary"} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs text-foreground"
                      style={{ fontWeight: 600 }}
                    >
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                    {n.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
