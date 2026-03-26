import { Outlet, Navigate, useLocation, useNavigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RightPanel } from './RightPanel';
import { PageContainer } from './PageContainer';
import { Loader2, FileText, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useDocTabs } from '../../contexts/DocTabsContext';
import { useRightPanel } from '../../contexts/RightPanelContext';
import { PreferencesService } from '../../services/PreferencesService';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { RightClickPalette } from '../ui/RightClickPalette';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, closeTab } = useDocTabs();
  const { content: rightPanelContent, closePanel } = useRightPanel();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs.length]);

  // Persist last visited path for session restore
  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login') {
      PreferencesService.set({ lastVisitedPath: location.pathname });
    }
  }, [location.pathname, isAuthenticated]);

  const scroll = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const amount = 200;
      tabsContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell-bg min-h-screen flex items-center justify-center">
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
    <div className="app-shell-bg min-h-screen text-slate-200 font-sans overflow-hidden flex flex-col">
      <RightClickPalette />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          {/* Multi-document tab strip — only shown when 2+ docs are open */}
          {tabs.length > 1 && (
            <div className="flex items-center bg-slate-900/60 border-b border-white/5 shrink-0">
              {/* Left scroll button */}
              {canScrollLeft && (
                <button
                  onClick={() => scroll('left')}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Tabs container */}
              <div
                ref={tabsContainerRef}
                onScroll={checkScroll}
                className="flex items-center gap-1 px-3 py-1 overflow-x-auto scrollbar-hide flex-1"
              >
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

              {/* Right scroll button */}
              {canScrollRight && (
                <button
                  onClick={() => scroll('right')}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Main content + right panel */}
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto p-6 pt-5 custom-scrollbar">
              <PageContainer maxWidth="xl">
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
              </PageContainer>
            </div>
            
            {/* Right Utility Panel */}
            {rightPanelContent && (
              <RightPanel content={rightPanelContent} onClose={closePanel} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
