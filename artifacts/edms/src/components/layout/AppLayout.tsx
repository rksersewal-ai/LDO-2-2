import { Outlet, Navigate, useLocation, useNavigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertCircle, Loader2, FileText, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useDocTabs } from '../../contexts/DocTabsContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, closeTab } = useDocTabs();

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

  const activeDocId = location.pathname.startsWith('/documents/')
    ? location.pathname.split('/')[2] ?? null
    : null;

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
    if (tabId === activeDocId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        const idx = tabs.findIndex(t => t.id === tabId);
        const next = remaining[Math.max(0, idx - 1)];
        navigate(`/documents/${next.id}`);
      } else {
        navigate('/documents');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/10 via-slate-950 to-green-900/10 text-slate-200 font-sans overflow-hidden flex flex-col">
      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-900 border-b border-teal-500/30 text-teal-100 text-xs px-4 py-1.5 flex items-center justify-center gap-2 cursor-pointer hover:from-teal-800 hover:to-emerald-800 transition-colors z-50 relative">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold">System Maintenance:</span>
        <span>OCR Engine Restart scheduled for 03:00 AM UTC. Expect minor delays in processing.</span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          {/* Multi-document tab strip — only shown when 2+ docs are open */}
          {tabs.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-slate-900/60 border-b border-white/5 overflow-x-auto shrink-0">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => navigate(`/documents/${tab.id}`)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl cursor-pointer text-xs font-medium whitespace-nowrap transition-all group border-b-2 ${
                    activeDocId === tab.id
                      ? 'bg-slate-800/70 text-teal-300 border-teal-500'
                      : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-[180px] truncate">{tab.name}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-all text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto p-6 pt-5 custom-scrollbar">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
