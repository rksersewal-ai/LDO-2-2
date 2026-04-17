/**
 * LDO-2 EDMS Design Tokens
 * Based on ERP / Industrial Web UI Guidelines
 *
 * These tokens enforce enterprise-grade consistency:
 * - Dense information display by default
 * - Optimized for trained repeat users
 * - Stable navigation across modules
 * - Color as supporting signal only
 */

// ─── Typography ────────────────────────────────────────────────────────────
export const typography = {
  /** Page title — 24px */
  pageTitle: "text-2xl", // 24px
  /** Section title — 16-20px */
  sectionTitle: "text-lg", // 18px
  /** Body text — 14px */
  body: "text-sm", // 14px
  /** Dense metadata — 13px */
  dense: "text-[13px]",
  /** Caption — 12px */
  caption: "text-xs", // 12px
  /** Tabular numerals for metrics and IDs */
  tabularNums: "font-variant-numeric: tabular-nums",
} as const;

// ─── Spacing (4px scale) ───────────────────────────────────────────────────
export const spacing = {
  /** 4px — micro */
  xs: "gap-1", // 4px
  /** 8px — tight gaps */
  sm: "gap-2", // 8px
  /** 12px — dense groups */
  md: "gap-3", // 12px
  /** 16px — default spacing */
  base: "gap-4", // 16px
  /** 24px — page padding */
  lg: "gap-6", // 24px
  /** 32px — large sections */
  xl: "gap-8", // 32px
} as const;

export const padding = {
  /** 8px tight */
  sm: "p-2",
  /** 12px dense */
  md: "p-3",
  /** 16px default */
  base: "p-4",
  /** 24px page */
  lg: "p-6",
  /** 32px large */
  xl: "p-8",
} as const;

// ─── Shell Layout ───────────────────────────────────────────────────────────
export const shell = {
  /** Left navigation — expanded 264px */
  navExpanded: "w-[264px]",
  /** Left navigation — collapsed rail 72px */
  navCollapsed: "w-[72px]",
  /** Nav item height */
  navItemHeight: "h-10", // 40px
  /** Right utility panel — 320-440px */
  rightPanelWidth: "w-[400px]",
  /** Top app bar height */
  topBarHeight: "h-14", // 56px
  /** Page header height */
  pageHeaderHeight: "h-16", // 64px
} as const;

// ─── Tables ─────────────────────────────────────────────────────────────────
export const table = {
  /** Header row — 40px */
  headerRow: "h-10",
  /** Standard row — 40px */
  standardRow: "h-10",
  /** Dense row — 32-36px */
  denseRow: "h-9",
  /** Numeric right-alignment */
  numericCell: "text-right tabular-nums",
} as const;

// ─── Forms ──────────────────────────────────────────────────────────────────
export const form = {
  /** Standard input height — 36px */
  inputHeight: "h-9", // 36px
  /** Dense input height — 32px */
  inputDense: "h-8", // 32px
  /** Standard button height — 36px */
  buttonHeight: "h-9", // 36px
  /** Dense button height — 32px */
  buttonDense: "h-8", // 32px
} as const;

// ─── Status States ──────────────────────────────────────────────────────────
export const states = {
  loading: "state-loading",
  empty: "state-empty",
  noResults: "state-no-results",
  partialData: "state-partial",
  validationError: "state-error",
  permissionRestricted: "state-restricted",
  offline: "state-offline",
  success: "state-success",
  backgroundProcessing: "state-processing",
  staleData: "state-stale",
} as const;

// ─── Status Colors (color as supporting signal, not sole indicator) ─────────
export const statusColors = {
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/25",
    icon: "✓",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/25",
    icon: "⚠",
  },
  danger: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/25",
    icon: "✕",
  },
  processing: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/25",
    icon: "◌",
  },
  neutral: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
    icon: "–",
  },
} as const;

// ─── Responsive Breakpoints ────────────────────────────────────────────────
export const breakpoints = {
  /** >=1440: full shell + right panel */
  full: "xl",
  /** 1200-1439: expanded nav, optional panel */
  desktop: "lg",
  /** 992-1199: compact nav, overlay panel */
  compact: "md",
  /** 768-991: temporary drawer */
  tablet: "sm",
  /** <768: simplified mobile flow */
  mobile: "xs",
} as const;
