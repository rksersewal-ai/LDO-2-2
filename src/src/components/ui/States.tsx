/**
 * ERP State Components
 * Based on ERP / Industrial Web UI Guidelines
 *
 * Every data view must handle these states:
 * - Loading (skeleton or spinner with label)
 * - Empty (no data yet — onboarding prompt)
 * - No Results (search returned nothing)
 * - Error (validation or server error)
 * - Restricted (permission denied)
 * - Background Processing (async job running)
 * - Stale Data (data may be outdated)
 *
 * Anti-patterns avoided:
 * - No color-only status chips (always include icon + text)
 * - No generic CTAs (always label specifically)
 * - No layout shift between states
 */

import { Skeleton, SkeletonTable, SkeletonCard } from "./Skeleton";

// ─── Loading State ─────────────────────────────────────────────────────────
interface LoadingStateProps {
  message?: string;
  variant?: "skeleton" | "spinner" | "table" | "card";
  rows?: number;
}

export function LoadingState({
  message = "Loading data…",
  variant = "skeleton",
  rows = 5,
}: LoadingStateProps) {
  if (variant === "table") return <SkeletonTable rows={rows} />;
  if (variant === "card") return <SkeletonCard />;
  if (variant === "spinner") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }
  return <SkeletonTable rows={rows} />;
}

// ─── Empty State ────────────────────────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── No Results State ───────────────────────────────────────────────────────
interface NoResultsStateProps {
  query?: string;
  onClear?: () => void;
}

export function NoResultsState({ query, onClear }: NoResultsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-3 text-muted-foreground/40">🔍</div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No results found
      </h3>
      {query && (
        <p className="text-sm text-muted-foreground mb-3">
          No matches for "
          <span className="font-medium text-foreground">{query}</span>"
        </p>
      )}
      {onClear && (
        <button onClick={onClear} className="btn-ghost text-sm">
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  code?: string | number;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  code,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-1">{message}</p>
      {code && (
        <p className="text-xs text-muted-foreground/70 mb-3">
          Error code: {code}
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Restricted State ───────────────────────────────────────────────────────
interface RestrictedStateProps {
  resource?: string;
  requiredRole?: string;
}

export function RestrictedState({
  resource,
  requiredRole,
}: RestrictedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-3">🔒</div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Access restricted
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {resource
          ? `You don't have permission to access ${resource}.`
          : "You don't have permission to view this content."}
      </p>
      {requiredRole && (
        <p className="text-xs text-muted-foreground/70 mt-2">
          Required role: <span className="font-medium">{requiredRole}</span>
        </p>
      )}
    </div>
  );
}

// ─── Background Processing State ────────────────────────────────────────────
interface ProcessingStateProps {
  jobLabel?: string;
  startedAt?: string;
}

export function ProcessingState({
  jobLabel = "Processing",
  startedAt,
}: ProcessingStateProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-sky-500/5 border border-sky-500/15">
      <div className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {jobLabel} in progress
        </p>
        {startedAt && (
          <p className="text-xs text-muted-foreground">Started {startedAt}</p>
        )}
      </div>
    </div>
  );
}

// ─── Stale Data Warning ────────────────────────────────────────────────────
interface StaleDataWarningProps {
  lastUpdated?: string;
  onRefresh?: () => void;
}

export function StaleDataWarning({
  lastUpdated,
  onRefresh,
}: StaleDataWarningProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-sm">
      <span className="text-amber-500">⚠</span>
      <span className="text-muted-foreground">
        Data may be outdated
        {lastUpdated ? ` (last updated ${lastUpdated})` : ""}
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-auto text-primary text-xs font-medium hover:underline"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
