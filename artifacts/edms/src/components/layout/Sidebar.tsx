import { NavLink, useLocation } from "react-router";
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
  Megaphone,
  ClipboardList,
  FileBarChart,
  BookOpen,
  Telescope,
  Bell,
  FileCheck2,
  MonitorCheck,
  CopyCheck,
  Users,
  Layers3,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import type { UserRole } from "../../lib/auth";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  roles?: UserRole[];
  exact?: boolean;
  badge?: number;
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
    ],
  },
  {
    label: "Engineering",
    items: [
      {
        icon: Component,
        label: "BOM Explorer",
        path: "/bom",
        roles: ["admin", "supervisor", "engineer"],
      },
      {
        icon: DatabaseBackup,
        label: "PL Knowledge Hub",
        path: "/pl",
        roles: ["admin", "supervisor", "engineer"],
      },
    ],
  },
  {
    label: "Workflow",
    items: [
      {
        icon: Briefcase,
        label: "Work Ledger",
        path: "/ledger",
        roles: ["admin", "supervisor", "engineer"],
      },
      {
        icon: ShieldAlert,
        label: "Cases",
        path: "/cases",
        roles: ["admin", "supervisor", "engineer", "reviewer"],
      },
      {
        icon: CheckSquare,
        label: "Approvals",
        path: "/approvals",
        roles: ["admin", "supervisor", "engineer", "reviewer"],
      },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: Bell, label: "Alert Rules", path: "/alerts" },
      { icon: FileCheck2, label: "Doc Templates", path: "/templates" },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        icon: BarChart3,
        label: "Reports",
        path: "/reports",
        roles: ["admin", "supervisor"],
      },
      {
        icon: FileBarChart,
        label: "Ledger Reports",
        path: "/ledger-reports",
        roles: ["admin", "supervisor"],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        icon: ServerCog,
        label: "Admin",
        path: "/admin",
        roles: ["admin"],
        exact: true,
      },
      {
        icon: Layers3,
        label: "Initial Run",
        path: "/admin/initial-run",
        roles: ["admin"],
      },
      { icon: Users, label: "Users", path: "/admin/users", roles: ["admin"] },
      {
        icon: CopyCheck,
        label: "Deduplication",
        path: "/admin/deduplication",
        roles: ["admin"],
      },
      { icon: Activity, label: "OCR Monitor", path: "/ocr", roles: ["admin"] },
      {
        icon: MonitorCheck,
        label: "System Health",
        path: "/health",
        roles: ["admin"],
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

const NAV_EXPANDED = 284;
const NAV_COLLAPSED = 76;

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasPermission } = useAuth();

  return (
    <aside
      style={{ width: isExpanded ? NAV_EXPANDED : NAV_COLLAPSED }}
      className="workspace-rail relative z-40 flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
    >
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-sidebar-primary/80 to-transparent" />

      {/* ── Logo + collapse toggle ────────────────────────────────────────── */}
      <div className="flex h-16 items-center border-b border-sidebar-border/80 px-4 shrink-0">
        {/* Brand mark */}
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 overflow-hidden",
            !isExpanded && "justify-center",
          )}
        >
          {/* Logo badge */}
          <img
            src="/sidebar-logo.png"
            alt="LDO-2"
            className="relative h-9 w-9 shrink-0 rounded-2xl border border-sidebar-border/80 bg-card/70 object-contain p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] select-none"
          />
          {isExpanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-sidebar-foreground">
                LDO-2 EDMS
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] leading-tight text-muted-foreground">
                Industrial Control
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle (only in expanded state) */}
        {isExpanded && (
          <button
            onClick={onToggle}
            title="Collapse navigation"
            aria-label="Collapse navigation"
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-sidebar-foreground/50 transition-all duration-150 hover:border-sidebar-border hover:bg-card/75 hover:text-sidebar-foreground"
          >
            <PanelLeftClose className="h-[15px] w-[15px]" />
          </button>
        )}
      </div>

      {/* ── Expand toggle (collapsed state only) ─────────────────────────── */}
      {!isExpanded && (
        <button
          onClick={onToggle}
          title="Expand navigation"
          aria-label="Expand navigation"
          className="mx-auto mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-sidebar-foreground/50 transition-all duration-150 hover:border-sidebar-border hover:bg-card/75 hover:text-sidebar-foreground"
        >
          <PanelLeftOpen className="h-[15px] w-[15px]" />
        </button>
      )}

      {/* ── Nav scroll area ─────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto py-2 scrollbar-hide"
      >
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || hasPermission(item.roles),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-2">
              {/* Section label */}
              {isExpanded ? (
                <div className="nav-section-label">{group.label}</div>
              ) : (
                <div className="mx-3 my-2 h-px bg-sidebar-border opacity-60" />
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);

                const link = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative mx-2 flex h-10 items-center gap-2.5 rounded-xl border transition-all duration-150",
                      isExpanded ? "px-3" : "justify-center px-0",
                      isActive
                        ? "border-sidebar-border bg-card/90 font-medium text-sidebar-foreground shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                        : "border-transparent text-sidebar-foreground/65 hover:border-sidebar-border/80 hover:bg-card/70 hover:text-sidebar-foreground",
                    )}
                  >
                    {/* Active left indicator */}
                    {isActive && (
                      <span className="absolute left-1 top-1/2 h-[18px] w-[4px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                    )}

                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-[17px] w-[17px] shrink-0 transition-colors duration-100",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
                      )}
                    />

                    {isExpanded && (
                      <span className="flex-1 overflow-hidden whitespace-nowrap text-[13px] leading-none tracking-[0.005em]">
                        {item.label}
                      </span>
                    )}

                    {isExpanded && item.badge != null && item.badge > 0 && (
                      <span
                        className="ml-auto shrink-0 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold tabular-nums flex items-center justify-center"
                        style={{
                          background: "hsl(var(--sidebar-primary) / 0.20)",
                          color: "hsl(var(--sidebar-primary))",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );

                if (!isExpanded) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return link;
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
