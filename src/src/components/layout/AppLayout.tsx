import { Outlet, Navigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/10 via-slate-950 to-green-900/10 text-slate-200 font-sans overflow-hidden flex flex-col">
      {/* Running Announcement Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-900 border-b border-teal-500/30 text-teal-100 text-xs px-4 py-1.5 flex items-center justify-center gap-2 cursor-pointer hover:from-teal-800 hover:to-emerald-800 transition-colors z-50 relative">
        <AlertCircle className="w-3.5 h-3.5" />
        <span style={{ fontWeight: 600 }}>System Maintenance:</span> 
        <span>OCR Engine Restart scheduled for 03:00 AM UTC. Expect minor delays in processing.</span>
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
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(20, 184, 166, 0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(20, 184, 166, 0.4); }
      `}</style>
    </div>
  );
}
