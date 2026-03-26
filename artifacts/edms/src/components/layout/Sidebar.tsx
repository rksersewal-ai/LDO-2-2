import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FolderOpen, Component, Activity,
  Briefcase, CheckSquare, BarChart3, ShieldAlert,
  Settings, ServerCog, DatabaseBackup,
  Megaphone, ClipboardList, FileBarChart, BookOpen, Telescope,
  Bell, FileCheck2, MonitorCheck, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import type { UserRole } from '../../lib/auth';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  roles?: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Telescope, label: "Search Explorer", path: "/search" },
      { icon: FolderOpen, label: "Document Hub", path: "/documents" },
    ]
  },
  {
    label: "Engineering",
    items: [
      { icon: Component, label: "BOM Explorer", path: "/bom", roles: ['admin', 'supervisor', 'engineer'] },
      { icon: DatabaseBackup, label: "PL Knowledge Hub", path: "/pl", roles: ['admin', 'supervisor', 'engineer'] },
    ]
  },
  {
    label: "Workflow",
    items: [
      { icon: Briefcase, label: "Work Ledger", path: "/ledger", roles: ['admin', 'supervisor', 'engineer'] },
      { icon: ShieldAlert, label: "Cases", path: "/cases", roles: ['admin', 'supervisor', 'engineer', 'reviewer'] },
      { icon: CheckSquare, label: "Approvals", path: "/approvals", roles: ['admin', 'supervisor', 'engineer', 'reviewer'] },
    ]
  },
  {
    label: "Tools",
    items: [
      { icon: Bell, label: "Alert Rules", path: "/alerts" },
      { icon: FileCheck2, label: "Doc Templates", path: "/templates" },
    ]
  },
  {
    label: "Reports",
    items: [
      { icon: BarChart3, label: "Reports", path: "/reports", roles: ['admin', 'supervisor'] },
      { icon: FileBarChart, label: "Ledger Reports", path: "/ledger-reports", roles: ['admin', 'supervisor'] },
    ]
  },
  {
    label: "System",
    items: [
      { icon: ServerCog, label: "Admin", path: "/admin", roles: ['admin'] },
      { icon: Activity, label: "OCR Monitor", path: "/ocr", roles: ['admin'] },
      { icon: MonitorCheck, label: "System Health", path: "/health", roles: ['admin'] },
      { icon: ClipboardList, label: "Audit Log", path: "/audit", roles: ['admin'] },
      { icon: Megaphone, label: "Banners", path: "/banners", roles: ['admin'] },
      { icon: Settings, label: "Settings", path: "/settings", roles: ['admin'] },
      { icon: BookOpen, label: "Design System", path: "/design-system", roles: ['admin'] },
    ]
  }
];

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isExpanded = isHovered;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 260 : 72 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-[calc(100vh-2rem)] ml-4 my-4 flex flex-col bg-slate-900/60 backdrop-blur-2xl border border-teal-500/20 shadow-2xl shadow-teal-950/50 rounded-2xl overflow-hidden z-40 shrink-0 group"
    >
      {!isExpanded && (
        <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg text-teal-400 bg-teal-500/10">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
      
      <div className="flex items-center p-4 gap-3 border-b border-white/5 min-h-[52px] hover:bg-slate-800/30 transition-colors">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
          <span className="text-white font-bold text-sm">L2</span>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 whitespace-nowrap overflow-hidden"
            >
              <h1 className="text-slate-100 font-semibold tracking-wide text-sm">LDO-2 EDMS</h1>
              <p className="text-teal-400/80 text-[10px] uppercase tracking-wider">Enterprise</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => !item.roles || hasPermission(item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-2">
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2 py-1 mb-1"
                  >
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{group.label}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {!isExpanded && <div className="h-px bg-slate-700/30 mx-2 mb-2" />}
              {visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={!isExpanded ? item.label : undefined}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {isActive && !isExpanded && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-teal-500" />
                    )}
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-teal-400' : ''}`} />
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1"
                        >
                    {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && isExpanded && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="w-1 h-4 rounded-full bg-teal-500 shrink-0"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>
    </motion.aside>
  );
}
