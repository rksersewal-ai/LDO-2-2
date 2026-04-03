import React from 'react';
import { cn } from '@/lib/utils';
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from './button';
import { Input as ShadcnInput } from './input';

export function GlassCard({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-card border-border rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function GlassCardTeal({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-card border-border-teal rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = ""
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "processing" | "info";
  size?: "sm" | "md";
  className?: string;
}) {
  const variants: Record<string, string> = {
    default: "bg-secondary/80 text-foreground/90 border border-border/60",
    success: "bg-teal-900/40 text-primary/90 border border-teal-500/30",
    warning: "bg-amber-900/40 text-amber-300 border border-amber-500/30",
    danger: "bg-rose-900/40 text-rose-300 border border-rose-500/30",
    processing: "bg-blue-900/40 text-blue-300 border border-blue-500/30 animate-pulse",
    info: "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30",
  };
  const sizes: Record<string, string> = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };
  return (
    <span className={`inline-flex items-center rounded-full font-medium tracking-wide ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Button component with standardized sizing per guidelines:
 * - sm: 36px (9) — icon buttons, secondary actions, compact contexts
 * - md: 40px (10) — standard buttons (default)
 * - lg: 48px (12) — prominent actions, modals, hero buttons
 * 
 * Variants: primary, secondary, ghost, danger, teal-outline
 * 
 * @example
 * <Button size="md" variant="primary">Save</Button>
 * <Button size="sm" variant="secondary">Edit</Button>
 * <Button size="lg" variant="danger" onClick={handleDelete}>Delete</Button>
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
  const variants: Record<string, ShadcnButtonProps["variant"]> = {
    primary: "default",
    secondary: "secondary",
    ghost: "ghost",
    danger: "destructive",
    "teal-outline": "outline",
  };
  const sizes: Record<string, ShadcnButtonProps["size"]> = {
    sm: "sm",
    md: "default",
    lg: "lg",
  };
  const variantClasses: Record<string, string> = {
    primary: "rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-900/30 border border-teal-400/20 hover:from-teal-500 hover:to-emerald-500",
    secondary: "rounded-xl bg-secondary/80 text-foreground border border-slate-600/60 hover:bg-slate-700/80 hover:border-slate-500",
    ghost: "rounded-xl bg-transparent text-foreground/90 hover:bg-white/5 hover:text-foreground",
    danger: "rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 hover:border-rose-500/50",
    "teal-outline": "rounded-xl bg-teal-500/10 text-primary/90 border border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-400/50",
  };
  const sizeClasses: Record<string, string> = {
    sm: "min-h-9 px-3 py-2 text-xs gap-1.5",
    md: "min-h-10 px-4 py-2.5 text-sm gap-2",
    lg: "min-h-12 px-5 py-3 text-sm gap-2",
  };
  return (
    <ShadcnButton
      variant={variants[variant]}
      size={sizes[size]}
      className={cn(
        "font-medium transition-all duration-150 cursor-pointer",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <ShadcnInput
      className={cn(
        "h-10 rounded-lg border-border bg-slate-950/60 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-600 focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/30 focus-visible:ring-offset-0",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full cursor-pointer rounded-lg border border-border bg-slate-950/60 px-3 py-2.5 text-sm text-foreground transition-all focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function StatCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-card border-border rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${accent ? 'text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400' : 'text-foreground'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

/**
 * PageHeader component for consistent page title and actions layout
 * 
 * @example
 * <PageHeader
 *   title="Documents"
 *   subtitle="Manage uploaded files and versions"
 *   primaryAction={{ label: 'Upload', onClick: ... }}
 *   secondaryActions={[
 *     { label: 'Export', icon: Download },
 *     { label: 'Settings', icon: Settings }
 *   ]}
 * />
 */
export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
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
  const derivedActions = (primaryAction || secondaryActions) ? (
    <div className="flex items-center gap-2 flex-shrink-0">
      {secondaryActions?.map((action, i) => (
        <Button
          key={i}
          variant={action.variant || 'secondary'}
          size="md"
          onClick={action.onClick}
          className="flex items-center gap-2"
        >
          {action.icon && <span className="w-4 h-4">{action.icon}</span>}
          {action.label}
        </Button>
      ))}

      {primaryAction && (
        <Button
          variant={primaryAction.variant || 'primary'}
          size="md"
          onClick={primaryAction.onClick}
          className="flex items-center gap-2"
        >
          {primaryAction.icon && <span className="w-4 h-4">{primaryAction.icon}</span>}
          {primaryAction.label}
        </Button>
      )}
    </div>
  ) : null;

  const actionContent = actions ?? children ?? derivedActions;

  return (
    <div className="flex flex-col gap-4 mb-6">
      {breadcrumb && <div className="text-sm text-muted-foreground">{breadcrumb}</div>}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </div>

        {/* Actions */}
        {actionContent && <div className="flex items-center gap-2 flex-shrink-0">{actionContent}</div>}
      </div>
    </div>
  );
}

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
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={`pill-filter ${value === opt ? 'pill-filter-active' : 'pill-filter-inactive'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
