import React from 'react';

export function GlassCard({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass-card rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function GlassCardTeal({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass-card-teal rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  className = ""
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "processing" | "info";
  className?: string;
}) {
  const variants: Record<string, string> = {
    default: "bg-slate-800/80 text-slate-300 border border-slate-700/60",
    success: "bg-teal-900/40 text-teal-300 border border-teal-500/30",
    warning: "bg-amber-900/40 text-amber-300 border border-amber-500/30",
    danger: "bg-rose-900/40 text-rose-300 border border-rose-500/30",
    processing: "bg-blue-900/40 text-blue-300 border border-blue-500/30 animate-pulse",
    info: "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${variants[variant]} ${className}`}>
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
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-900/30 border border-teal-400/20",
    secondary: "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-600/60 hover:border-slate-500",
    ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-slate-100",
    danger: "bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 hover:border-rose-500/50",
    "teal-outline": "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:border-teal-400/50",
  };
  const sizes: Record<string, string> = {
    sm: "h-9 px-3 py-2 text-xs gap-1.5",
    md: "h-10 px-4 py-2.5 text-sm gap-2",
    lg: "h-12 px-5 py-3 text-sm gap-2",
  };
  return (
    <button
      className={`rounded-xl font-medium transition-all duration-150 flex items-center justify-center cursor-pointer ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function StatCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="glass-card rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${accent ? 'text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400' : 'text-slate-100'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
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
}: {
  title: string;
  subtitle?: string;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      {breadcrumb && <div className="text-sm text-slate-400">{breadcrumb}</div>}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">{title}</h1>
          {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryActions) && (
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
        )}
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
          key={opt}
          onClick={() => onChange(opt)}
          className={`pill-filter ${value === opt ? 'pill-filter-active' : 'pill-filter-inactive'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
