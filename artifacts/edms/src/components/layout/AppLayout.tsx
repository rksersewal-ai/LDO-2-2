import { Outlet, Navigate, useLocation, useNavigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RightPanel } from "./RightPanel";
import { PageContainer } from "./PageContainer";
import { Loader2, FileText, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useDocTabs } from "../../contexts/DocTabsContext";
import { useRightPanel } from "../../contexts/RightPanelContext";
import { PreferencesService } from "../../services/PreferencesService";
import { NavigationHistoryService } from "../../services/NavigationHistoryService";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { RightClickPalette } from "../ui/RightClickPalette";
import { getDocumentContextAttributes } from "../documents/DocumentPreviewActions";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, closeTab } = useDocTabs();
  const { content: rightPanelContent, closePanel } = useRightPanel();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sidebar expand/collapse — persisted in preferences
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    try {
      const prefs = PreferencesService.get();
      return (prefs as any).sidebarExpanded ?? true;
    } catch {
      return true;
    }
  });

  const handleSidebarToggle = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        PreferencesService.set({
          ...(PreferencesService.get() as any),
          sidebarExpanded: next,
        });
      } catch {}
      return next;
    });
  };

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tabs.length]);

  // Persist last visited path for session restore
  useEffect(() => {
    if (isAuthenticated && location.pathname !== "/login") {
      const route = `${location.pathname}${location.search}`;
      PreferencesService.set({ lastVisitedPath: route });
      NavigationHistoryService.record(route);
    }
  }, [location.pathname, location.search, isAuthenticated]);

  const scroll = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const amount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const activeDocId = location.pathname.startsWith("/documents/")
    ? (location.pathname.split("/")[2] ?? null)
    : null;

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
    if (tabId === activeDocId) {
      const remaining = tabs.filter((t) => t.id !== tabId);
      if (remaining.length > 0) {
        const idx = tabs.findIndex((t) => t.id === tabId);
        const next = remaining[Math.max(0, idx - 1)];
        navigate(`/documents/${next.id}`);
      } else {
        navigate("/documents");
      }
    }
  };

  return (
    <div className="workspace-shell app-shell-bg min-h-screen text-foreground font-sans overflow-hidden flex flex-col">
      <RightClickPalette />

      {/* ── Shell: sidebar + main ─────────────────────────────── */}
      <div className="flex flex-1 gap-3 overflow-hidden px-3 py-3 md:gap-4 md:px-4 md:py-4">
        {/* Persistent left navigation rail */}
        <Sidebar isExpanded={sidebarExpanded} onToggle={handleSidebarToggle} />

        {/* ── Main column ─────────────────────────────────────── */}
        <main className="workspace-main flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          {/* Multi-document tab strip — only shown when 2+ docs are open */}
          {tabs.length > 1 && (
            <div className="shrink-0 px-3 pb-2">
              <div className="flex items-center rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl">
                {canScrollLeft && (
                  <button
                    onClick={() => scroll("left")}
                    className="shrink-0 p-2 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div
                  ref={tabsContainerRef}
                  onScroll={checkScroll}
                  className="flex flex-1 items-center gap-1 overflow-x-auto px-3 py-2 scrollbar-hide"
                >
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      {...getDocumentContextAttributes(tab.id, tab.name)}
                      onClick={() => navigate(`/documents/${tab.id}`)}
                      className={`group flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                        activeDocId === tab.id
                          ? "border-primary/25 bg-primary/8 text-primary shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                          : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/45 hover:text-foreground"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="max-w-[180px] truncate">{tab.name}</span>
                      <button
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="ml-1 rounded-md p-0.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {canScrollRight && (
                  <button
                    onClick={() => scroll("right")}
                    className="shrink-0 p-2 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Content + optional right panel ─────────────────── */}
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto px-4 pb-4 pt-3 custom-scrollbar md:px-6 md:pb-6 md:pt-4">
              <PageContainer maxWidth="xl">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
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
