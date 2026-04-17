import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  FolderOpen,
  Component,
  Activity,
  Briefcase,
  CheckSquare,
  BarChart3,
  ShieldAlert,
  Settings,
  ServerCog,
  DatabaseBackup,
  Search,
  Menu,
  Megaphone,
  ClipboardList,
  FileBarChart,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import type { UserRole } from "../../lib/auth";

interface NavItem {
  icon: any;
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
      { icon: FolderOpen, label: "Document Hub", path: "/documents" },
    ],
  },
  {
    label: "Engineering",
    items: [
      { icon: Component, label: "BOM Explorer", path: "/bom" },
      { icon: DatabaseBackup, label: "PL Knowledge Hub", path: "/pl" },
    ],
  },
  {
    label: "Workflow",
    items: [
      { icon: Briefcase, label: "Work Ledger", path: "/ledger" },
      { icon: ShieldAlert, label: "Cases", path: "/cases" },
      { icon: CheckSquare, label: "Approvals", path: "/approvals" },
    ],
  },
  {
    label: "Reports",
    items: [
      { icon: BarChart3, label: "Reports", path: "/reports" },
      { icon: FileBarChart, label: "Ledger Reports", path: "/ledger-reports" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: ServerCog, label: "Admin", path: "/admin", roles: ["admin"] },
      {
        icon: Activity,
        label: "OCR Monitor",
        path: "/ocr",
        roles: ["admin", "engineer"],
      },
      {
        icon: ClipboardList,
        label: "Audit Log",
        path: "/audit",
        roles: ["admin"],
      },
      { icon: Megaphone, label: "Banners", path: "/banners", roles: ["admin"] },
      {
        icon: Settings,
        label: "Settings",
        path: "/settings",
        roles: ["admin"],
      },
      {
        icon: BookOpen,
        label: "Design System",
        path: "/design-system",
        roles: ["admin"],
      },
    ],
  },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  // Handle click on nav items to expand sidebar if collapsed
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (!isExpanded) {
      e.preventDefault(); // Prevent navigation just this once to show labels
      setIsExpanded(true);
    }
    // If expanded, normal navigation occurs
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 260 : 72 }}
      className="h-[calc(100vh-2rem)] ml-4 my-4 flex flex-col bg-sidebar border border-sidebar-border shadow-2xl rounded-3xl overflow-hidden z-40 shrink-0"
    >
      <div
        className="flex items-center p-5 gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <img
          src="/logo.png"
          alt="LDO-2"
          className="w-8 h-8 rounded-full object-contain shrink-0"
        />
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 whitespace-nowrap overflow-hidden"
            >
              <h1 className="text-sidebar-foreground font-semibold tracking-wide text-sm">
                LDO-2 EDMS
              </h1>
              <p className="text-primary/80 text-[10px] uppercase tracking-wider">
                Enterprise
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
        {navGroups.map((group, i) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || hasPermission(item.roles),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={i} className="mb-6">
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                  >
                    {group.label}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/" &&
                      location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={(e) => handleNavClick(e, item.path)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-primary rounded-r-full shadow-[0_0_10px_var(--color-sidebar-primary)]"
                        />
                      )}
                      <item.icon
                        className={`w-5 h-5 shrink-0 ${isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground"}`}
                      />
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-sm font-medium whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.aside>
  );
}
