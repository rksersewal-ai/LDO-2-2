import type React from "react";
import { cn } from "@/lib/utils";
import {
  Button as ShadcnButton,
  type ButtonProps as ShadcnButtonProps,
} from "./button";
import { Input as ShadcnInput } from "./input";

/* ── Card surfaces ──────────────────────────────────────────────────────── */

export function GlassCard({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card border border-border rounded-md", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCardTeal({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card rounded-md", className)}
      style={{ border: "1px solid hsl(var(--primary) / 0.28)" }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Status Badge ───────────────────────────────────────────────────────── */

const BADGE_STYLES: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  default: {
    text: "hsl(var(--foreground) / 0.85)",
    bg: "hsl(var(--secondary))",
    border: "hsl(var(--border))",
  },
  success: {
    text: "hsl(174, 65%, 60%)",
    bg: "hsl(174, 55%, 13%)",
    border: "hsl(174, 52%, 20%)",
  },
  warning: {
    text: "hsl(38,  95%, 62%)",
    bg: "hsl(38,  80%, 11%)",
    border: "hsl(38,  70%, 21%)",
  },
  danger: {
    text: "hsl(0,   70%, 64%)",
    bg: "hsl(0,   58%, 11%)",
    border: "hsl(0,   58%, 21%)",
  },
  processing: {
    text: "hsl(210, 78%, 62%)",
    bg: "hsl(210, 58%, 11%)",
    border: "hsl(210, 52%, 21%)",
  },
  info: {
    text: "hsl(240, 72%, 68%)",
    bg: "hsl(240, 52%, 11%)",
    border: "hsl(240, 48%, 21%)",
  },
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "processing"
    | "info";
  size?: "sm" | "md";
  className?: string;
}) {
  const s = BADGE_STYLES[variant] ?? BADGE_STYLES.default;
  const sizeClass =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-semibold tracking-[0.025em] leading-none",
        variant === "processing" && "animate-pulse",
        sizeClass,
        className,
      )}
      style={{
        color: s.text,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {children}
    </span>
  );
}

/* ── Button ─────────────────────────────────────────────────────────────── */
/**
 * Standardized Button:
 * – primary: solid teal, no gradient
 * – secondary: bordered ghost on dark surface
 * – ghost: text-only, no border
 * – danger: rose, reserved for destructive actions
 * – teal-outline: teal border + bg tint
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "teal-outline";
  size?: "sm" | "md" | "lg";
}) {
  const variantMap: Record<string, ShadcnButtonProps["variant"]> = {
    primary: "default",
    secondary: "secondary",
    ghost: "ghost",
    danger: "destructive",
    "teal-outline": "outline",
  };
  const sizeMap: Record<string, ShadcnButtonProps["size"]> = {
    sm: "sm",
    md: "default",
    lg: "lg",
  };

  /* Exact style per variant — flat, no gradient */
  const variantCls: Record<string, string> = {
    primary:
      "rounded-md font-semibold text-white border border-transparent transition-colors duration-150 cursor-pointer " +
      "bg-[hsl(var(--primary))] hover:bg-[hsl(174,78%,34%)] active:bg-[hsl(174,78%,30%)]",
    secondary:
      "rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80 hover:border-border/70 transition-colors duration-150 cursor-pointer",
    ghost:
      "rounded-md border-transparent bg-transparent text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors duration-150 cursor-pointer",
    danger:
      "rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/18 hover:border-rose-500/50 transition-colors duration-150 cursor-pointer",
    "teal-outline":
      "rounded-md border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--primary)/0.14)] hover:border-[hsl(var(--primary)/0.55)] transition-colors duration-150 cursor-pointer",
  };
  const sizeCls: Record<string, string> = {
    sm: "min-h-9  px-3 py-2   text-xs  gap-1.5",
    md: "min-h-10 px-4 py-2.5 text-[13px] gap-2",
    lg: "min-h-12 px-5 py-3   text-sm  gap-2",
  };

  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size={sizeMap[size]}
      className={cn(
        "font-medium transition-colors duration-150",
        sizeCls[size],
        variantCls[variant],
        className,
      )}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}

/* ── Input ──────────────────────────────────────────────────────────────── */

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <ShadcnInput
      className={cn(
        "h-10 rounded-md border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground",
        "placeholder:text-muted-foreground/50",
        "focus-visible:border-[hsl(var(--primary)/0.55)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary)/0.25)] focus-visible:ring-offset-0",
        "transition-colors duration-150",
        className,
      )}
      {...props}
    />
  );
}

/* ── Select ─────────────────────────────────────────────────────────────── */

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full cursor-pointer rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground",
        "transition-colors duration-150",
        "focus:border-[hsl(var(--primary)/0.55)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.25)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────────── */

/**
 * KPI metric card with optional colour accent on the top border.
 * Uses `stat-number` class for monospaced tabular figures.
 *
 * @example
 * <StatCard label="Documents" value={1_824} sub="+12 today" colorVariant="teal" />
 */
export function StatCard({
  label,
  value,
  sub,
  accent = false,
  colorVariant = "teal",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  colorVariant?: "teal" | "amber" | "blue" | "rose" | "violet" | "orange";
}) {
  const topBorder: Record<string, string> = {
    teal: "stat-card-teal",
    amber: "stat-card-amber",
    blue: "stat-card-blue",
    rose: "stat-card-rose",
    violet: "stat-card-violet",
    orange: "stat-card-orange",
  };

  return (
    <div
      className={cn("stat-card", topBorder[colorVariant] ?? "stat-card-teal")}
    >
      <div className="px-4 pt-4 pb-3.5 flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
          {label}
        </span>
        <span
          className={cn("stat-number", accent && "text-[hsl(var(--primary))]")}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {sub && (
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        )}
      </div>
    </div>
  );
}

/* ── Page Header ────────────────────────────────────────────────────────── */

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const derivedActions =
    primaryAction || secondaryActions ? (
      <div className="flex items-center gap-2 flex-shrink-0">
        {secondaryActions?.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? "secondary"}
            size="md"
            onClick={action.onClick}
          >
            {action.icon && (
              <span className="w-4 h-4" aria-hidden="true">
                {action.icon}
              </span>
            )}
            {action.label}
          </Button>
        ))}
        {primaryAction && (
          <Button
            variant={primaryAction.variant ?? "primary"}
            size="md"
            onClick={primaryAction.onClick}
          >
            {primaryAction.icon && (
              <span className="w-4 h-4" aria-hidden="true">
                {primaryAction.icon}
              </span>
            )}
            {primaryAction.label}
          </Button>
        )}
      </div>
    ) : null;

  const actionContent = actions ?? children ?? derivedActions;

  return (
    <div className="flex flex-col gap-4 mb-6">
      {breadcrumb && (
        <div className="text-xs text-muted-foreground">{breadcrumb}</div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight leading-tight"
            style={{ letterSpacing: "-0.01em" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actionContent && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actionContent}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Filter Pills ───────────────────────────────────────────────────────── */

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Filter options"
    >
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={cn(
            "pill-filter",
            value === opt ? "pill-filter-active" : "pill-filter-inactive",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
