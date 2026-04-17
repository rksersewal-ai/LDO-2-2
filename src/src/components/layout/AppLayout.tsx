import { Outlet, Navigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen app-shell-bg text-foreground font-sans overflow-hidden flex flex-col">
      {/* Running Announcement Banner */}
      <div className="bg-primary text-primary-foreground text-xs px-4 py-1.5 flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/90 transition-colors z-50 relative">
        <AlertCircle className="w-3.5 h-3.5" />
        <span style={{ fontWeight: 600 }}>System Maintenance:</span>
        <span>
          OCR Engine Restart scheduled for 03:00 AM UTC. Expect minor delays in
          processing.
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-8 pt-0 custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--muted); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--primary); opacity: 0.5; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--primary); }
      `}</style>
    </div>
  );
}
