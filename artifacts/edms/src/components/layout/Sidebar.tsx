import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FolderOpen, Component, Activity,
  Briefcase, CheckSquare, BarChart3, ShieldAlert,
  Settings, ServerCog, DatabaseBackup,
  Megaphone, ClipboardList, FileBarChart, BookOpen, Telescope
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
      { icon: ClipboardList, label: "Audit Log", path: "/audit", roles: ['admin'] },
      { icon: Megaphone, label: "Banners", path: "/banners", roles: ['admin'] },
      { icon: Settings, label: "Settings", path: "/settings", roles: ['admin'] },
      { icon: BookOpen, label: "Design System", path: "/design-system", roles: ['admin'] },
    ]
  }
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { hasPermission } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 260 : 72 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-[calc(100vh-2rem)] ml-4 my-4 flex flex-col bg-slate-900/60 backdrop-blur-2xl border border-teal-500/20 shadow-2xl shadow-teal-950/50 rounded-3xl overflow-hidden z-40 shrink-0"
    >
      <div className="flex items-center p-5 gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
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
                    onClick={() => { if (!isExpanded) setIsExpanded(true); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-400' : ''}`} />
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1 h-4 rounded-full bg-teal-500 shrink-0"
                        style={{ display: isExpanded ? 'block' : 'none' }}
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
