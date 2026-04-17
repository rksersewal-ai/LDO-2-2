// ═══════════════════════════════════════════════════════════════════════════════
// LDO-2 EDMS — Design System Registry & Component Inventory Matrix
// ═══════════════════════════════════════════════════════════════════════════════
// This file is the single source of truth for all design tokens, component
// metadata, UX decisions, screen-component mappings, and governance rules.
// It powers the in-app Design System page and serves as developer handoff docs.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. DESIGN TOKENS ────────────────────────────────────────────────────────

export const DESIGN_TOKENS = {
  colors: {
    brand: {
      primary: {
        value: "#0d9488",
        tailwind: "teal-600",
        usage: "Primary actions, active states, CTAs",
      },
      primaryHover: {
        value: "#14b8a6",
        tailwind: "teal-500",
        usage: "Primary hover states",
      },
      secondary: {
        value: "#059669",
        tailwind: "emerald-600",
        usage: "Gradient endpoints, accents",
      },
      secondaryHover: {
        value: "#10b981",
        tailwind: "emerald-500",
        usage: "Secondary hover states",
      },
    },
    surface: {
      base: {
        value: "#020617",
        tailwind: "slate-950",
        usage: "App background, deepest layer",
      },
      raised: {
        value: "rgba(15,23,42,0.6)",
        tailwind: "slate-900/60",
        usage: "Cards, panels (glass-morphism)",
      },
      overlay: {
        value: "rgba(15,23,42,0.8)",
        tailwind: "slate-900/80",
        usage: "Modals, drawers, overlays",
      },
      input: {
        value: "rgba(2,6,23,0.5)",
        tailwind: "slate-950/50",
        usage: "Form input backgrounds",
      },
    },
    text: {
      primary: {
        value: "#f8fafc",
        tailwind: "slate-50/white",
        usage: "Headings, primary content",
      },
      secondary: {
        value: "#cbd5e1",
        tailwind: "slate-300",
        usage: "Body text, descriptions",
      },
      tertiary: {
        value: "#94a3b8",
        tailwind: "slate-400",
        usage: "Labels, metadata, captions",
      },
      muted: {
        value: "#64748b",
        tailwind: "slate-500",
        usage: "Disabled text, timestamps",
      },
      disabled: {
        value: "#475569",
        tailwind: "slate-600",
        usage: "Fully disabled elements",
      },
    },
    status: {
      success: {
        value: "#2dd4bf",
        bg: "teal-900/50",
        border: "teal-500/30",
        text: "teal-300",
        usage: "Approved, completed, valid",
      },
      warning: {
        value: "#fbbf24",
        bg: "amber-900/50",
        border: "amber-500/30",
        text: "amber-300",
        usage: "Pending, attention needed",
      },
      danger: {
        value: "#f87171",
        bg: "rose-900/50",
        border: "rose-500/30",
        text: "rose-300",
        usage: "Failed, rejected, errors",
      },
      info: {
        value: "#60a5fa",
        bg: "blue-900/50",
        border: "blue-500/30",
        text: "blue-300",
        usage: "Processing, informational",
      },
      neutral: {
        value: "#94a3b8",
        bg: "slate-800",
        border: "slate-700",
        text: "slate-300",
        usage: "Default, draft, inactive",
      },
    },
    border: {
      subtle: {
        value: "rgba(20,184,166,0.2)",
        tailwind: "teal-500/20",
        usage: "Card borders, dividers",
      },
      hover: {
        value: "rgba(20,184,166,0.4)",
        tailwind: "teal-400/40",
        usage: "Hover state borders",
      },
      focus: {
        value: "rgba(20,184,166,0.5)",
        tailwind: "teal-400/50",
        usage: "Focus rings, active borders",
      },
      strong: {
        value: "rgba(20,184,166,0.6)",
        tailwind: "teal-500/60",
        usage: "Active nav indicator",
      },
    },
    glow: {
      primary: {
        value: "rgba(20,184,166,0.2)",
        usage: "Shadow glow on primary elements",
      },
      surface: {
        value: "rgba(15,41,38,0.5)",
        tailwind: "teal-950/50",
        usage: "Card shadow depth",
      },
    },
  },
  typography: {
    scale: [
      {
        name: "display",
        size: "30px",
        use: "Page titles (Dashboard, Settings)",
      },
      { name: "heading-1", size: "24px", use: "Section headings" },
      { name: "heading-2", size: "20px", use: "Card titles" },
      { name: "heading-3", size: "18px", use: "Sub-section titles" },
      { name: "body", size: "14px", use: "Default body text, table cells" },
      { name: "body-sm", size: "13px", use: "Secondary descriptions" },
      { name: "caption", size: "12px", use: "Metadata, timestamps, labels" },
      { name: "micro", size: "11px", use: "Badges, tags, counters" },
      { name: "nano", size: "10px", use: "Tracking labels, version numbers" },
    ],
    fontWeights: {
      bold: { value: 700, usage: "Brand mark, key metrics" },
      semibold: { value: 600, usage: "Headings, CTAs, active labels" },
      medium: { value: 500, usage: "Form labels, nav items" },
      normal: { value: 400, usage: "Body text, descriptions" },
    },
    textSizeControl: {
      min: 12,
      default: 14,
      max: 18,
      stepSize: 1,
      cssVariable: "--font-size",
      rationale:
        "Enterprise users on long sessions need size control for readability. Controlled via Header toolbar.",
    },
  },
  spacing: {
    scale: [
      { token: "space-1", value: "4px", use: "Inline gaps (icon-to-text)" },
      { token: "space-2", value: "8px", use: "Tight component padding" },
      { token: "space-3", value: "12px", use: "Default component padding" },
      { token: "space-4", value: "16px", use: "Section padding, card gaps" },
      { token: "space-5", value: "20px", use: "Large card padding" },
      { token: "space-6", value: "24px", use: "Card body padding" },
      { token: "space-8", value: "32px", use: "Page padding, section gaps" },
      { token: "space-10", value: "40px", use: "Major section separators" },
    ],
    pageLayout: {
      mainPadding: "32px (p-8)",
      sidebarCollapsed: "72px",
      sidebarExpanded: "260px",
      maxContentWidth: "1400px (most screens), 7xl/1280px (dashboard)",
      headerHeight: "auto (breadcrumb + toolbar)",
      bannerHeight: "~30px",
    },
  },
  radii: {
    sm: {
      value: "6px",
      tailwind: "rounded-md",
      use: "Checkboxes, small elements",
    },
    md: {
      value: "8px",
      tailwind: "rounded-lg",
      use: "Tabs, dropdowns, small cards",
    },
    lg: {
      value: "12px",
      tailwind: "rounded-xl",
      use: "Buttons, inputs, badges",
    },
    xl: {
      value: "16px",
      tailwind: "rounded-2xl",
      use: "Cards, panels, login card",
    },
    full: {
      value: "24px",
      tailwind: "rounded-3xl",
      use: "Sidebar container, brand mark",
    },
    pill: {
      value: "9999px",
      tailwind: "rounded-full",
      use: "Badges, status dots, avatars",
    },
  },
  elevation: {
    card: "shadow-lg shadow-teal-950/50",
    cardHeavy: "shadow-2xl shadow-teal-950/50",
    nav: "shadow-[0_0_10px_rgba(45,212,191,0.5)]",
    button: "shadow-md shadow-teal-900/20",
    brand: "shadow-xl shadow-teal-500/20",
  },
  glassMorphism: {
    standard: {
      bg: "bg-slate-900/40",
      backdrop: "backdrop-blur-xl",
      border: "border border-teal-500/20",
      shadow: "shadow-lg shadow-teal-950/50",
      radius: "rounded-2xl",
      combined:
        "bg-slate-900/40 backdrop-blur-xl border border-teal-500/20 shadow-lg shadow-teal-950/50 rounded-2xl",
    },
    heavy: {
      bg: "bg-slate-900/60",
      backdrop: "backdrop-blur-2xl",
      border: "border border-teal-500/20",
      shadow: "shadow-2xl shadow-teal-950/50",
      radius: "rounded-2xl",
      combined:
        "bg-slate-900/60 backdrop-blur-2xl border border-teal-500/20 shadow-2xl shadow-teal-950/50 rounded-2xl",
    },
  },
  accessibility: {
    focusRing: "focus:ring-1 focus:ring-teal-400/50 focus:outline-none",
    contrastRatios: {
      primaryOnDark: "7.2:1 (AAA)",
      secondaryTextOnDark: "5.1:1 (AA)",
      mutedTextOnDark: "3.8:1 (AA-large)",
    },
    motionPreference:
      "All Motion animations respect prefers-reduced-motion via Motion library defaults.",
    keyboardNav:
      "Tab order follows visual order. Active nav uses layoutId animation for smooth transition.",
    textScaling:
      "User-controlled 12-18px range via header controls. All text uses relative sizing from --font-size CSS variable.",
  },
};

// ─── 2. COMPONENT INVENTORY MATRIX ───────────────────────────────────────────

export interface ComponentEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  variants: string[];
  states: string[];
  sizes: string[];
  usedIn: string[];
  uxNotes: string;
  handoffNotes: string;
  doGuidance: string[];
  dontGuidance: string[];
  accessibility: string;
  futureConsiderations: string;
}

export const COMPONENT_INVENTORY: ComponentEntry[] = [
  // ── Primitives ──
  {
    id: "CMP-001",
    name: "GlassCard",
    category: "Surfaces",
    file: "/src/components/ui/Shared.tsx",
    variants: ["Standard (default)", "Heavy (login, sidebar)"],
    states: ["Default", "Hover (via children)"],
    sizes: ["Fluid (100% width, content-driven height)"],
    usedIn: [
      "Dashboard",
      "Documents",
      "DocumentDetail",
      "BOMExplorer",
      "PLKnowledgeHub",
      "WorkLedger",
      "Cases",
      "Approvals",
      "Reports",
      "OCRMonitor",
      "AuditLog",
      "Settings",
      "AdminWorkspace",
      "BannerManagement",
      "SearchExplorer",
    ],
    uxNotes:
      "The foundational surface primitive. All content panels, cards, and sections use GlassCard for visual consistency. The glass-morphism effect creates depth hierarchy against the gradient background.",
    handoffNotes:
      "Uses backdrop-blur-xl which requires GPU compositing. bg-slate-900/40 provides a semi-transparent base. Border is teal-500/20 for subtle brand reinforcement. Always use rounded-2xl.",
    doGuidance: [
      "Use for any content grouping that needs visual containment",
      "Apply p-6 for standard card padding, p-4 for compact contexts",
      "Nest cards sparingly — max 1 level deep",
    ],
    dontGuidance: [
      "Don't use on very small elements (use bg classes directly)",
      "Don't override the border radius — consistency is critical",
      "Don't nest GlassCards inside GlassCards (creates blur-on-blur artifacts)",
    ],
    accessibility:
      "Ensure sufficient contrast between card content and the semi-transparent background. The border provides an additional visual boundary.",
    futureConsiderations:
      "May need a 'flat' variant for print/export views where backdrop-blur is unavailable.",
  },
  {
    id: "CMP-002",
    name: "Button",
    category: "Actions",
    file: "/src/components/ui/Shared.tsx",
    variants: [
      "Primary (gradient CTA)",
      "Secondary (slate, neutral actions)",
      "Ghost (minimal, toolbar actions)",
      "Danger (destructive actions)",
    ],
    states: ["Default", "Hover", "Disabled", "Loading (via Loader2 icon)"],
    sizes: [
      "Standard (px-4 py-2)",
      "Compact (px-3 py-1.5 — used in toolbars)",
      "Full-width (w-full — login)",
    ],
    usedIn: ["All screens — universal action primitive"],
    uxNotes:
      "Primary buttons use the brand teal→emerald gradient to draw attention. Secondary for non-priority actions. Ghost for toolbar/filter contexts where visual weight must be minimal. Danger for destructive ops (delete, revoke).",
    handoffNotes:
      "Primary uses gradient background (from-teal-600 to-emerald-600) with border-teal-400/20 for subtle edge. Disabled state uses opacity-50 + cursor-not-allowed. Loading spinner: Loader2 with animate-spin.",
    doGuidance: [
      "Use Primary for the single most important action per section",
      "Use Secondary for supporting actions (Export, Filter)",
      "Use Ghost in toolbars and compact contexts",
      "Always include an icon before the label for Primary/Secondary",
    ],
    dontGuidance: [
      "Don't place multiple Primary buttons side-by-side",
      "Don't use Danger without a confirmation dialog",
      "Don't use Ghost for important standalone actions",
    ],
    accessibility:
      "All buttons have focus:ring via Tailwind. Use aria-label for icon-only buttons. Disabled buttons keep the label visible for context.",
    futureConsiderations:
      "Add 'Outline' variant for secondary emphasis. Consider adding a size='sm' prop.",
  },
  {
    id: "CMP-003",
    name: "Badge",
    category: "Data Display",
    file: "/src/components/ui/Shared.tsx",
    variants: [
      "Default (neutral)",
      "Success (approved/completed)",
      "Warning (pending/attention)",
      "Danger (failed/rejected)",
      "Processing (animated pulse)",
    ],
    states: ["Static", "Animated (processing variant pulses)"],
    sizes: ["Standard (px-2.5 py-0.5, text-xs)"],
    usedIn: [
      "Dashboard",
      "Documents",
      "DocumentDetail",
      "BOMExplorer",
      "WorkLedger",
      "Cases",
      "Approvals",
      "OCRMonitor",
      "AuditLog",
      "SearchExplorer",
    ],
    uxNotes:
      "Badges convey status at a glance. Color semantics are strict: teal=success, amber=warning, rose=danger, blue=processing, slate=neutral. The processing variant uses animate-pulse to indicate ongoing activity (OCR processing, sync in progress).",
    handoffNotes:
      "Each variant has bg/text/border triplet. Uses rounded-full for pill shape. Font size is always text-xs with font-medium. Never change the color mapping — it's a system-wide contract.",
    doGuidance: [
      "Use in tables, cards, metadata rows for status indication",
      "Always use the correct semantic variant",
      "Keep badge text short (1-2 words)",
    ],
    dontGuidance: [
      "Don't create custom badge colors outside the 5 variants",
      "Don't use badges for counts (use a number in a circle instead)",
      "Don't use Processing variant for static complete/failed states",
    ],
    accessibility:
      "Color is never the sole indicator — the text label is always present alongside the color.",
    futureConsiderations:
      "Add 'info' variant (blue, non-animated). Add dismissible badge for filter chips.",
  },
  {
    id: "CMP-004",
    name: "Input",
    category: "Forms",
    file: "/src/components/ui/Shared.tsx",
    variants: [
      "Standard (text input)",
      "With icon (search inputs)",
      "With validation error",
    ],
    states: ["Default", "Focus (teal ring)", "Error (rose border)", "Disabled"],
    sizes: ["Standard (px-4 py-2)", "Full-width (w-full)"],
    usedIn: [
      "Login",
      "Documents (filter)",
      "SearchExplorer",
      "Settings",
      "BannerManagement",
      "AdminWorkspace",
    ],
    uxNotes:
      "Inputs use a dark semi-transparent background (slate-950/50) with a teal border that intensifies on focus. This creates a 'sunken' effect within GlassCards. Placeholder text is slate-600 for low visual noise.",
    handoffNotes:
      "Focus styles: border-teal-400/50 + ring-1 ring-teal-400/50. For icon inputs, use pl-9 and position the icon absolutely at left-3. Error state swaps border to border-rose-500/50.",
    doGuidance: [
      "Always pair with a <label>",
      "Use placeholder text for example values",
      "Group related inputs vertically with space-y-5",
    ],
    dontGuidance: [
      "Don't use floating labels — they cause accessibility issues",
      "Don't override the border color outside of error state",
      "Don't use for large text — use textarea",
    ],
    accessibility:
      "Always associate with a label via htmlFor. Focus ring is visible. Error messages appear below in text-xs text-rose-400.",
    futureConsiderations:
      "Add textarea variant. Add character counter for constrained inputs.",
  },
  // ── Navigation ──
  {
    id: "CMP-010",
    name: "Sidebar",
    category: "Navigation",
    file: "/src/components/layout/Sidebar.tsx",
    variants: ["Collapsed (72px, icon-only)", "Expanded (260px, icon + label)"],
    states: [
      "Default",
      "Hovered item",
      "Active item (with animated indicator)",
      "Group headers visible (expanded only)",
    ],
    sizes: ["Fixed height: calc(100vh - 2rem), margin: ml-4 my-4"],
    usedIn: ["AppLayout (global — all authenticated screens)"],
    uxNotes:
      "Floating sidebar with rounded-3xl corners. Starts collapsed showing only circular icons. Expands on click (not hamburger). Active route highlighted with a teal left-bar indicator using Motion layoutId for smooth transition between items. Nav items are grouped by function (Core, Intelligence, Operations, Admin). Role-based filtering hides unauthorized items.",
    handoffNotes:
      "Uses Motion animate for width transition. AnimatePresence wraps labels for enter/exit animation. NavLink from react-router provides active detection. layoutId='activeNav' creates the sliding active indicator. Icon size is always w-5 h-5.",
    doGuidance: [
      "Keep nav items to essential modules only",
      "Group related items logically",
      "Use role-based visibility for admin items",
      "Maintain consistent icon style (Lucide, w-5 h-5)",
    ],
    dontGuidance: [
      "Don't add a hamburger menu — the sidebar itself is the toggle",
      "Don't exceed 15 nav items total",
      "Don't use nested sub-menus — flat structure only",
    ],
    accessibility:
      "All nav items are NavLink elements with proper href. Active item has visual indicator beyond color (position bar). Keyboard navigable via tab.",
    futureConsiderations:
      "Pin/unpin sidebar preference. Keyboard shortcut to toggle. Notification badges on nav items.",
  },
  {
    id: "CMP-011",
    name: "Header",
    category: "Navigation",
    file: "/src/components/layout/Header.tsx",
    variants: ["Standard (breadcrumb + toolbar)"],
    states: [
      "Default",
      "Notification panel open",
      "Text size controls open",
      "Profile dropdown open",
    ],
    sizes: ["Full width, auto height"],
    usedIn: ["AppLayout (global)"],
    uxNotes:
      "Header contains breadcrumb navigation, global search trigger, text size controls (A-/A+), notification bell with badge, and user profile dropdown. Each dropdown is mutually exclusive (opening one closes others). Breadcrumbs auto-generate from the current route path.",
    handoffNotes:
      "Uses useLocation for breadcrumb generation. Text size adjusts --font-size CSS variable. Profile dropdown includes role badge and logout button. Notification badge shows unread count.",
    doGuidance: [
      "Keep header utilities minimal — search, text size, notifications, profile",
      "Breadcrumbs should always show Home as the root",
    ],
    dontGuidance: [
      "Don't add complex actions to the header",
      "Don't make breadcrumbs clickable beyond Home (current implementation)",
    ],
    accessibility:
      "All interactive elements are buttons with visible labels. Dropdowns close on outside click via useRef/useEffect pattern.",
    futureConsiderations:
      "Add clickable breadcrumbs. Add global command palette (Ctrl+K).",
  },
  {
    id: "CMP-012",
    name: "NotificationPanel",
    category: "Navigation",
    file: "/src/components/layout/NotificationPanel.tsx",
    variants: ["Standard dropdown panel"],
    states: ["Open", "Closed", "Empty state", "With unread items"],
    sizes: ["Fixed width dropdown (w-96)"],
    usedIn: ["Header"],
    uxNotes:
      "Slides down from the notification bell icon. Shows recent system notifications with timestamps. Categorized by type (approval, system, OCR). Unread items have a teal dot indicator.",
    handoffNotes:
      "Positioned absolutely below the bell icon. Max height with overflow-y-auto for scrolling. Each notification item is clickable to navigate to the relevant module.",
    doGuidance: [
      "Show max 10 recent notifications",
      "Group by time (Today, Yesterday, Earlier)",
    ],
    dontGuidance: [
      "Don't auto-dismiss notifications without user action",
      "Don't block the UI when panel is open",
    ],
    accessibility:
      "Panel can be dismissed with Escape key. Focus traps within the panel when open.",
    futureConsiderations:
      "Real-time push notifications. Mark all as read. Notification preferences.",
  },
  {
    id: "CMP-013",
    name: "AnnouncementBanner",
    category: "Navigation",
    file: "/src/components/layout/AppLayout.tsx (inline)",
    variants: ["Info (teal gradient)", "Warning (amber)", "Critical (rose)"],
    states: ["Visible", "Dismissed"],
    sizes: ["Full width, fixed height (~30px)"],
    usedIn: ["AppLayout (global, above sidebar+main)"],
    uxNotes:
      "System-wide announcement bar pinned to the top of the authenticated layout. Uses a teal-to-emerald gradient background. Displays maintenance notices, system alerts, or admin broadcasts. Managed via BannerManagement admin page.",
    handoffNotes:
      "Currently hardcoded in AppLayout. Future: fetch from BannerManagement state. Uses flex items-center justify-center with icon + text.",
    doGuidance: [
      "Keep banner text concise — single line",
      "Use AlertCircle icon for all banner types",
      "Make clickable to navigate to detail",
    ],
    dontGuidance: [
      "Don't stack multiple banners",
      "Don't use for non-critical information",
    ],
    accessibility:
      "Banner has role='alert' semantics. Text is readable against the gradient background.",
    futureConsiderations:
      "Dismissible banners with session memory. Priority-based stacking. Scheduled banners.",
  },
  // ── Data Display ──
  {
    id: "CMP-020",
    name: "DataTable",
    category: "Data Display",
    file: "Inline in Documents, WorkLedger, AuditLog, OCRMonitor, etc.",
    variants: [
      "Standard (full columns)",
      "Compact (fewer columns)",
      "Selectable (with checkboxes)",
    ],
    states: ["Default", "Row hover", "Row selected", "Empty state", "Loading"],
    sizes: ["Full width within GlassCard"],
    usedIn: [
      "Documents",
      "WorkLedger",
      "AuditLog",
      "OCRMonitor",
      "Approvals",
      "Cases",
      "SearchExplorer",
    ],
    uxNotes:
      "Tables are the primary data display pattern in EDMS. Every table uses the same structure: thead with text-slate-500 uppercase tracking headers, tbody with hover:bg-slate-800/30 rows, teal accent on interactive elements. Rows are clickable to navigate to detail views.",
    handoffNotes:
      "Currently built inline per page (not abstracted). Uses standard HTML table elements. Header cells use text-xs uppercase tracking-wider text-slate-500. Row hover is hover:bg-slate-800/30. Cell padding is px-4 py-3. Status columns use Badge component.",
    doGuidance: [
      "Always include a header row",
      "Make rows clickable when they link to detail views",
      "Use Badge for status columns",
      "Right-align numeric columns",
      "Include an empty state when no data matches filters",
    ],
    dontGuidance: [
      "Don't use table for fewer than 3 items (use cards instead)",
      "Don't exceed 8 visible columns without horizontal scroll",
      "Don't hide the header row",
    ],
    accessibility:
      "Use semantic <table>, <thead>, <tbody>, <tr>, <th>, <td>. Clickable rows should have cursor-pointer and keyboard focus handling.",
    futureConsiderations:
      "Abstract into a reusable <DataTable> component with sorting, pagination, column resize, and column visibility toggles.",
  },
  {
    id: "CMP-021",
    name: "MetadataRow / PropertyList",
    category: "Data Display",
    file: "Inline in DocumentDetail, PLDetail",
    variants: [
      "Horizontal (label: value)",
      "Vertical stack",
      "With icon prefix",
    ],
    states: ["Default", "Editable (future)"],
    sizes: ["Fluid"],
    usedIn: [
      "DocumentDetail (right panel)",
      "PLDetail",
      "BOMExplorer (detail drawer)",
    ],
    uxNotes:
      "Displays key-value metadata pairs for documents, PL records, and BOM items. Labels are muted (text-slate-500) and values are bright (text-slate-200). This pattern provides scannability for document-heavy workflows.",
    handoffNotes:
      "Typical pattern: <div><span className='text-slate-500 text-xs'>Label</span><span className='text-slate-200 text-sm'>Value</span></div>. Grouped in columns with space-y-3.",
    doGuidance: [
      "Group related metadata together",
      "Use consistent label width for alignment",
      "Show 'N/A' for missing values, never empty",
    ],
    dontGuidance: [
      "Don't show more than 15 metadata fields without grouping/tabs",
      "Don't use full sentences as labels",
    ],
    accessibility:
      "Labels should be semantically associated with values. Consider using <dl>/<dt>/<dd> for proper semantics.",
    futureConsiderations:
      "Inline editing mode. Copy-to-clipboard on value click.",
  },
  {
    id: "CMP-022",
    name: "StatWidget",
    category: "Data Display",
    file: "Inline in Dashboard, OCRMonitor, WorkLedger",
    variants: [
      "Standard (icon + count + label)",
      "With trend indicator",
      "Compact (count only)",
    ],
    states: ["Default", "Loading (skeleton)"],
    sizes: ["Grid-responsive (grid-cols-3 or grid-cols-4)"],
    usedIn: ["Dashboard", "OCRMonitor", "WorkLedger", "Reports"],
    uxNotes:
      "Top-of-page summary widgets that give immediate KPI visibility. Each uses a GlassCard with a colored icon container (matching the semantic color of the metric), a large number, and a supporting description.",
    handoffNotes:
      "Icon container: w-8 h-8 rounded-lg bg-{color}-500/10 text-{color}-400. Metric number: text-3xl font-bold text-white. Description: text-xs text-slate-500.",
    doGuidance: [
      "Use 3-4 stat widgets per section",
      "Match icon color to the metric's semantic meaning",
      "Keep descriptions under 10 words",
    ],
    dontGuidance: [
      "Don't use more than 4 in a row (use 2 rows instead)",
      "Don't show decimal precision for counts",
    ],
    accessibility:
      "Each widget is self-contained with readable text. Not interactive — purely informational.",
    futureConsiderations:
      "Clickable widgets that filter/navigate. Sparkline mini-charts inside widgets.",
  },
  // ── Document-Specific ──
  {
    id: "CMP-030",
    name: "DocumentCard (Grid View)",
    category: "Domain-Specific",
    file: "/src/pages/Documents.tsx (inline)",
    variants: ["Standard card", "With OCR status indicator"],
    states: ["Default", "Hover (scale + border glow)", "Selected"],
    sizes: ["Grid responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)"],
    usedIn: ["Documents (grid view)"],
    uxNotes:
      "Card representation of a document for visual browsing. Shows document type icon, name, revision, status badge, author, date, and tags. Hover state lifts the card slightly. Clickable to navigate to DocumentDetail.",
    handoffNotes:
      "Uses GlassCard as base. Hover adds border-teal-500/40 transition. Contains Badge for status. Tags shown as small chip-like spans.",
    doGuidance: [
      "Show the most critical metadata: name, status, revision, date",
      "Use file-type-appropriate icons",
    ],
    dontGuidance: [
      "Don't show full metadata in cards (that's for the detail view)",
      "Don't exceed 3 lines for the document name",
    ],
    accessibility:
      "Entire card is clickable. Focus outline matches hover state.",
    futureConsiderations:
      "Drag-to-compare. Multi-select for batch actions. Thumbnail preview.",
  },
  {
    id: "CMP-031",
    name: "DocumentPreview (3-Column Layout)",
    category: "Domain-Specific",
    file: "/src/pages/DocumentDetail.tsx",
    variants: ["Standard 3-column", "Maximized preview (future)"],
    states: [
      "Default",
      "Tab switching",
      "OCR panel expanded",
      "History panel open",
    ],
    sizes: ["Full viewport (3-column: tabs | preview | metadata)"],
    usedIn: ["DocumentDetail"],
    uxNotes:
      "The primary document workspace. Left column: open document tabs. Center: document preview area with zoom controls and toolbar. Right: metadata panel with document properties, linked PL records, OCR confidence, revision history. This layout supports power-user workflows where engineers compare documents and reference metadata simultaneously.",
    handoffNotes:
      "Left tab bar: ~48px wide with vertical doc tabs. Center: flex-1. Right panel: ~320px wide. All within a flex row. Uses GlassCard for the main container.",
    doGuidance: [
      "Always show metadata panel by default",
      "Allow tab management (close, reorder)",
      "Show OCR confidence prominently for OCR-processed docs",
    ],
    dontGuidance: [
      "Don't hide the metadata panel by default",
      "Don't auto-close tabs without user action",
    ],
    accessibility:
      "Tab list is keyboard navigable. Preview area supports zoom controls.",
    futureConsiderations:
      "Resizable panels. Split-view comparison. Annotation tools. PDF rendering.",
  },
  {
    id: "CMP-032",
    name: "OCRConfidenceBar",
    category: "Domain-Specific",
    file: "Inline in DocumentDetail, OCRMonitor",
    variants: ["Bar (horizontal fill)", "Badge (percentage text)"],
    states: [
      "Completed (color by confidence)",
      "Processing (animated)",
      "Failed (rose)",
    ],
    sizes: ["Inline (within metadata rows)"],
    usedIn: ["DocumentDetail", "OCRMonitor"],
    uxNotes:
      "Shows OCR extraction confidence as a visual progress bar. Color transitions: ≥90% = teal (good), 70-89% = amber (review needed), <70% = rose (poor, manual review required). This is critical for QA workflows.",
    handoffNotes:
      "Implemented as a div with dynamic width (style={{ width: `${confidence}%` }}) and background color based on thresholds.",
    doGuidance: [
      "Always show both the bar AND the percentage number",
      "Use the threshold colors consistently",
    ],
    dontGuidance: [
      "Don't show the bar for documents that haven't been OCR'd",
      "Don't round the percentage — show exact value",
    ],
    accessibility:
      "Include aria-valuenow, aria-valuemin, aria-valuemax on the progress element.",
    futureConsiderations:
      "Click to drill into per-page confidence. Show field-level confidence.",
  },
  // ── Tree/Hierarchy ──
  {
    id: "CMP-040",
    name: "BOMTree",
    category: "Domain-Specific",
    file: "/src/pages/BOMExplorer.tsx",
    variants: ["Standard tree", "With search filter"],
    states: [
      "Default",
      "Node expanded",
      "Node collapsed",
      "Node selected",
      "Empty state",
    ],
    sizes: ["Left panel (~300px), detail in right panel"],
    usedIn: ["BOMExplorer"],
    uxNotes:
      "Hierarchical tree visualization of Bill of Materials structures. Expandable/collapsible nodes with indent-based depth indication. Selected node shows detail in the right panel. Critical for navigating complex engineering BOMs with hundreds of items.",
    handoffNotes:
      "Uses recursive rendering with indent levels. Each node is a clickable div with expand/collapse chevron. Selected node gets bg-teal-500/10 highlight.",
    doGuidance: [
      "Show part numbers and brief descriptions in the tree",
      "Support expand-all/collapse-all",
      "Highlight the search-matched nodes",
    ],
    dontGuidance: [
      "Don't render more than 3 levels deep without lazy loading",
      "Don't auto-expand all nodes on load",
    ],
    accessibility:
      "Tree implements ARIA tree pattern (role='tree', role='treeitem'). Arrow key navigation.",
    futureConsiderations:
      "Virtual scrolling for large BOMs. Drag-and-drop reordering. Inline editing.",
  },
  // ── Workflow/Status ──
  {
    id: "CMP-050",
    name: "ApprovalCard",
    category: "Workflow",
    file: "/src/pages/Approvals.tsx (inline)",
    variants: [
      "Pending (action required)",
      "Completed (read-only)",
      "Rejected",
    ],
    states: ["Default", "Action buttons visible", "Processing action"],
    sizes: ["Full width within list"],
    usedIn: ["Approvals", "Dashboard (widget)"],
    uxNotes:
      "Displays an approval request with document reference, requester info, deadline, and action buttons (Approve/Reject). Pending approvals are visually prominent. Completed approvals are dimmed.",
    handoffNotes:
      "Uses GlassCard. Action buttons: Primary for Approve, Danger for Reject. Shows deadline countdown in amber when ≤24h.",
    doGuidance: [
      "Show the document name prominently",
      "Include the requester and deadline",
      "Make Approve/Reject buttons clearly distinguishable",
    ],
    dontGuidance: [
      "Don't allow approval without viewing the document",
      "Don't hide the rejection reason field",
    ],
    accessibility:
      "Action buttons have clear labels. Deadline uses both color and text for urgency.",
    futureConsiderations:
      "Batch approval. Delegation. Approval chain visualization.",
  },
  // ── Admin ──
  {
    id: "CMP-060",
    name: "AdminWidget",
    category: "Admin",
    file: "/src/pages/AdminWorkspace.tsx (inline)",
    variants: ["User management", "System health", "Configuration"],
    states: ["Default", "Editing", "Saving"],
    sizes: ["Grid layout within admin page"],
    usedIn: ["AdminWorkspace"],
    uxNotes:
      "Admin-only widgets for system configuration, user management, and health monitoring. Only visible to admin role. Uses same GlassCard foundation but with additional action density.",
    handoffNotes:
      "Role-gated: only rendered when hasPermission(['admin']). Uses the same design tokens as all other components.",
    doGuidance: [
      "Gate all admin components with role checks",
      "Show confirmation dialogs for destructive admin actions",
    ],
    dontGuidance: [
      "Don't show admin options to non-admin users",
      "Don't allow bulk user deletion without extra confirmation",
    ],
    accessibility:
      "Admin pages follow the same accessibility standards as all other pages.",
    futureConsiderations:
      "Admin audit trail. Bulk user import. System backup controls.",
  },
  // ── Filters ──
  {
    id: "CMP-070",
    name: "FilterChip / TabFilter",
    category: "Filters",
    file: "Inline in OCRMonitor, Cases, Approvals, WorkLedger",
    variants: [
      "Pill-shaped tab (active/inactive)",
      "Dropdown filter",
      "Toggle switch",
    ],
    states: ["Active (teal bg)", "Inactive (transparent)", "Hover"],
    sizes: ["Inline, auto-width"],
    usedIn: [
      "OCRMonitor",
      "Cases",
      "Approvals",
      "WorkLedger",
      "Documents",
      "AuditLog",
    ],
    uxNotes:
      "Horizontal filter tabs for quick data segmentation. Active tab gets bg-teal-500/20 with teal text. Used for status-based filtering (All, Completed, Failed, Processing). Provides instant feedback without page reload.",
    handoffNotes:
      "Implemented as button elements in a flex row with gap-2. Active: bg-teal-500/20 text-teal-300. Inactive: bg-slate-800 text-slate-400 hover:bg-slate-700.",
    doGuidance: [
      "Always include 'All' as the first filter option",
      "Show count next to filter label when possible",
      "Keep to 5 or fewer filter tabs",
    ],
    dontGuidance: [
      "Don't use for navigation — only for data filtering",
      "Don't mix filter tabs with other action buttons",
    ],
    accessibility: "Use role='tablist' and role='tab' with aria-selected.",
    futureConsiderations: "Multi-select filters. Saved filter presets.",
  },
  // ── Feedback ──
  {
    id: "CMP-080",
    name: "ErrorBanner / AlertBanner",
    category: "Feedback",
    file: "Inline in Login, various pages",
    variants: [
      "Error (rose)",
      "Warning (amber)",
      "Info (blue)",
      "Success (teal)",
    ],
    states: ["Visible", "Dismissed"],
    sizes: ["Full width within parent container"],
    usedIn: ["Login", "AppLayout (session expired)", "Forms (validation)"],
    uxNotes:
      "Contextual alert banners for form errors, system warnings, and success messages. Always positioned at the top of the relevant section. Uses icon + message + optional detail text pattern.",
    handoffNotes:
      "Pattern: p-3 rounded-xl bg-{color}-500/10 border border-{color}-500/30. Icon: AlertCircle in the semantic color. Text: text-sm text-{color}-300.",
    doGuidance: [
      "Show immediately upon error",
      "Include actionable guidance when possible",
      "Auto-dismiss success messages after 5 seconds",
    ],
    dontGuidance: [
      "Don't stack more than 2 alerts simultaneously",
      "Don't use alerts for non-actionable information",
    ],
    accessibility:
      "Use role='alert' for error messages. Ensure sufficient contrast.",
    futureConsiderations:
      "Toast notifications via Sonner for non-blocking feedback.",
  },
  {
    id: "CMP-081",
    name: "EmptyState",
    category: "Feedback",
    file: "Inline in Documents, SearchExplorer, WorkLedger",
    variants: [
      "No results",
      "No data yet",
      "Error loading",
      "Restricted access",
    ],
    states: ["Static"],
    sizes: ["Centered within parent"],
    usedIn: [
      "Documents (empty filter)",
      "SearchExplorer (no query)",
      "RestrictedAccess",
    ],
    uxNotes:
      "Shown when a view has no data to display. Always includes an icon, a headline, a brief description, and optionally a CTA button. Prevents users from seeing a blank screen.",
    handoffNotes:
      "Pattern: centered flex column with icon (w-12 h-12 text-slate-600), heading (text-lg text-slate-400), description (text-sm text-slate-500), optional Button.",
    doGuidance: [
      "Always show an empty state — never a blank area",
      "Include a CTA when the user can take action to populate the view",
      "Use contextual messaging (not generic 'No data')",
    ],
    dontGuidance: [
      "Don't use empty states for loading — use skeletons instead",
      "Don't make empty states alarming",
    ],
    accessibility:
      "Descriptive text ensures screen readers convey the state. CTA button is keyboard accessible.",
    futureConsiderations:
      "Illustrated empty states with custom SVGs. Contextual suggestions.",
  },
  // ── Charts ──
  {
    id: "CMP-090",
    name: "AreaChart (Recharts)",
    category: "Data Visualization",
    file: "/src/pages/Dashboard.tsx (inline)",
    variants: ["Standard area", "With gradient fill"],
    states: ["Default", "Tooltip hover", "Loading"],
    sizes: ["ResponsiveContainer within GlassCard"],
    usedIn: ["Dashboard (storage usage)", "Reports", "LedgerReports"],
    uxNotes:
      "Used for time-series data visualization. The teal gradient fill matches the brand. Tooltip shows precise values on hover. Grid lines are very subtle (slate-800) to avoid visual noise in the dark theme.",
    handoffNotes:
      "Uses Recharts library. CartesianGrid uses strokeDasharray='3 3' with stroke slate-800. Area fill uses a linearGradient from teal-500 to transparent. Tooltip has dark background matching the theme.",
    doGuidance: [
      "Use for time-series and trend data",
      "Keep Y-axis labels minimal",
      "Match chart colors to the brand palette",
    ],
    dontGuidance: [
      "Don't use area charts for categorical comparisons (use bar charts)",
      "Don't show more than 3 data series in one chart",
    ],
    accessibility:
      "Provide a text summary of the chart data for screen readers.",
    futureConsiderations:
      "Interactive drill-down. Export chart data. More chart types (bar, pie, radar).",
  },
];

// ─── 3. SCREEN-TO-COMPONENT MAP ─────────────────────────────────────────────

export interface ScreenMapping {
  id: string;
  name: string;
  path: string;
  file: string;
  description: string;
  components: string[]; // CMP IDs
  roleAccess: string[];
  uxDecisions: string[];
  flows: string[]; // FLOW IDs
  edgeCases: string[];
}

export const SCREEN_MAP: ScreenMapping[] = [
  {
    id: "SCR-001",
    name: "Login",
    path: "/login",
    file: "/src/pages/Login.tsx",
    description:
      "Authentication entry point. Dark-themed login card with LAN context indicator, demo credentials hint, session expired banner, and security notice.",
    components: ["CMP-004", "CMP-080"],
    roleAccess: ["public"],
    uxDecisions: [
      "Login is the only unauthenticated screen — all others redirect here",
      "LAN context indicator (10.0.x.x) reinforces internal-only access for enterprise feel",
      "Session expired banner shows above login card to explain re-auth requirement",
      "Demo credentials displayed in a subtle card below for evaluation purposes",
      "Password visibility toggle for complex enterprise passwords",
      "Login attempt counter triggers security warning at ≥3 failures",
    ],
    flows: ["FLOW-001"],
    edgeCases: [
      "Session expired: shows amber banner with explanation",
      "3+ failed attempts: shows IT contact suggestion",
      "Already authenticated: redirects to / via Navigate",
      "Case-insensitive username matching (lowercased before lookup)",
    ],
  },
  {
    id: "SCR-002",
    name: "Dashboard",
    path: "/",
    file: "/src/pages/Dashboard.tsx",
    description:
      "Landing page after login. Shows KPI widgets (pending approvals, open cases, storage), storage trend chart, and recent documents list.",
    components: ["CMP-001", "CMP-002", "CMP-003", "CMP-022", "CMP-090"],
    roleAccess: ["engineer", "reviewer", "admin", "viewer"],
    uxDecisions: [
      "Dashboard is the default landing page — provides immediate situational awareness",
      "3 stat widgets: Pending Approvals, Open Cases, Total Documents — the metrics enterprise users check first",
      "Storage chart uses area chart for trend visibility",
      "Recent documents table provides quick-access to recently touched files",
      "Upload Document CTA in top-right for quick action",
    ],
    flows: ["FLOW-002"],
    edgeCases: [
      "New user with no documents: show welcome message + guided upload",
      "All approvals complete: stat widget shows 0 with positive messaging",
    ],
  },
  {
    id: "SCR-003",
    name: "Documents Repository",
    path: "/documents",
    file: "/src/pages/Documents.tsx",
    description:
      "Full document repository with list/grid view toggle, search/filter bar, status-based filtering, and batch actions.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-004",
      "CMP-020",
      "CMP-030",
      "CMP-070",
      "CMP-081",
    ],
    roleAccess: ["engineer", "reviewer", "admin", "viewer"],
    uxDecisions: [
      "List view is the default — optimized for scanning large document sets",
      "Grid view available for visual browsing",
      "Obsolete documents hidden by default — toggleable via checkbox",
      "Search filters by ID, Name, or Metadata",
      "Status badges use consistent semantic colors across the system",
    ],
    flows: ["FLOW-003"],
    edgeCases: [
      "No matching documents: show empty state with clear filter suggestion",
      "Obsolete toggle: defaults to hidden, persisted in local state",
    ],
  },
  {
    id: "SCR-004",
    name: "Document Detail / Preview",
    path: "/documents/:id",
    file: "/src/pages/DocumentDetail.tsx",
    description:
      "Three-column document workspace: tab bar, document preview, metadata/properties panel. The primary power-user screen.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-021",
      "CMP-031",
      "CMP-032",
    ],
    roleAccess: ["engineer", "reviewer", "admin", "viewer"],
    uxDecisions: [
      "3-column layout supports simultaneous document viewing and metadata reference",
      "Tab system allows multiple open documents for comparison workflows",
      "Metadata panel shows all document properties, linked PL records, OCR status, and revision history",
      "Zoom controls in the preview toolbar",
      "Download, edit, and version actions in the toolbar",
    ],
    flows: ["FLOW-003", "FLOW-005"],
    edgeCases: [
      "All tabs closed: navigate back to Documents list",
      "Document not found: show error state with back navigation",
      "OCR processing: show progress indicator in metadata panel",
    ],
  },
  {
    id: "SCR-005",
    name: "Search Explorer",
    path: "/search",
    file: "/src/pages/SearchExplorer.tsx",
    description:
      "Global search interface for documents, PL records, BOM items, and metadata. Supports advanced query syntax.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-004",
      "CMP-020",
      "CMP-081",
    ],
    roleAccess: ["engineer", "reviewer", "admin", "viewer"],
    uxDecisions: [
      "Search is a first-class module — not just a header utility",
      "Supports cross-entity search (documents, PL, BOM)",
      "Results grouped by entity type with counts",
      "Recent searches stored for quick re-execution",
    ],
    flows: ["FLOW-004"],
    edgeCases: [
      "Empty query: show recent searches and suggestions",
      "No results: show empty state with query refinement tips",
    ],
  },
  {
    id: "SCR-006",
    name: "PL Knowledge Hub",
    path: "/pl",
    file: "/src/pages/PLKnowledgeHub.tsx",
    description:
      "Product Lifecycle records browser with card-based layout, status filtering, and linked document counts.",
    components: ["CMP-001", "CMP-002", "CMP-003", "CMP-020", "CMP-070"],
    roleAccess: ["engineer", "reviewer", "admin"],
    uxDecisions: [
      "PL records shown as cards rather than table — each record has rich metadata",
      "Linked document count shown prominently for traceability",
      "Status-based filtering matches the EDMS lifecycle model",
    ],
    flows: ["FLOW-006"],
    edgeCases: ["PL with no linked documents: show with warning indicator"],
  },
  {
    id: "SCR-007",
    name: "BOM Explorer",
    path: "/bom",
    file: "/src/pages/BOMExplorer.tsx",
    description:
      "Bill of Materials tree explorer with hierarchical navigation, search, and detail panel.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-004",
      "CMP-021",
      "CMP-040",
    ],
    roleAccess: ["engineer", "admin"],
    uxDecisions: [
      "Tree-based navigation reflects the natural hierarchy of BOM structures",
      "Detail panel on the right shows selected item's full properties",
      "Search filters the tree to matching nodes",
    ],
    flows: ["FLOW-007"],
    edgeCases: [
      "Very deep nesting (>5 levels): support lazy loading",
      "Empty BOM: show guided creation empty state",
    ],
  },
  {
    id: "SCR-008",
    name: "Work Ledger",
    path: "/ledger",
    file: "/src/pages/WorkLedger.tsx",
    description:
      "Time and activity tracking for document-related work. Tabular layout with date filtering and export.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-020",
      "CMP-022",
      "CMP-070",
    ],
    roleAccess: ["engineer", "reviewer", "admin"],
    uxDecisions: [
      "Table-first design for data density",
      "Date range filtering for period-based review",
    ],
    flows: [],
    edgeCases: [
      "No entries for selected period: show empty state with date adjustment suggestion",
    ],
  },
  {
    id: "SCR-009",
    name: "Cases",
    path: "/cases",
    file: "/src/pages/Cases.tsx",
    description:
      "Issue/case management linked to documents and PL records. Status tracking and assignment.",
    components: ["CMP-001", "CMP-002", "CMP-003", "CMP-020", "CMP-070"],
    roleAccess: ["engineer", "reviewer", "admin"],
    uxDecisions: [
      "Cases linked to documents for full traceability",
      "Status-based filtering with badge indicators",
    ],
    flows: ["FLOW-008"],
    edgeCases: ["Unlinked case: show warning to link a document"],
  },
  {
    id: "SCR-010",
    name: "Approvals",
    path: "/approvals",
    file: "/src/pages/Approvals.tsx",
    description:
      "Approval queue with pending/completed/rejected views. Action buttons for approve/reject with notes.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-020",
      "CMP-050",
      "CMP-070",
    ],
    roleAccess: ["engineer", "reviewer", "admin"],
    uxDecisions: [
      "Pending approvals shown first and prominently",
      "Approve/Reject actions always visible for pending items",
    ],
    flows: ["FLOW-009"],
    edgeCases: [
      "No pending approvals: show success empty state",
      "Expired approval deadline: show warning",
    ],
  },
  {
    id: "SCR-011",
    name: "OCR Monitor",
    path: "/ocr",
    file: "/src/pages/OCRMonitor.tsx",
    description:
      "OCR processing pipeline monitor with job status, confidence metrics, and retry controls.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-020",
      "CMP-022",
      "CMP-032",
      "CMP-070",
    ],
    roleAccess: ["engineer", "admin"],
    uxDecisions: [
      "OCR is a background process — monitor provides visibility without requiring manual intervention",
      "Failed jobs have retry button for immediate re-processing",
      "Confidence scores shown with visual bar for quick scanning",
    ],
    flows: ["FLOW-005"],
    edgeCases: [
      "All jobs completed: show health-check summary",
      "OCR engine offline: show system alert",
    ],
  },
  {
    id: "SCR-012",
    name: "Audit Log",
    path: "/audit",
    file: "/src/pages/AuditLog.tsx",
    description:
      "System-wide audit trail showing all user actions, document changes, and system events.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-004",
      "CMP-020",
      "CMP-070",
    ],
    roleAccess: ["admin", "reviewer"],
    uxDecisions: [
      "Chronological order with most recent first",
      "Filterable by action type, user, and date range",
    ],
    flows: [],
    edgeCases: [
      "Very large log: pagination required",
      "Sensitive actions highlighted",
    ],
  },
  {
    id: "SCR-013",
    name: "Admin Workspace",
    path: "/admin",
    file: "/src/pages/AdminWorkspace.tsx",
    description:
      "System administration dashboard with user management, configuration, and health monitoring.",
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-004",
      "CMP-020",
      "CMP-060",
    ],
    roleAccess: ["admin"],
    uxDecisions: [
      "Admin-only access enforced at route and component level",
      "Destructive actions require confirmation",
    ],
    flows: ["FLOW-010"],
    edgeCases: ["Non-admin access: redirect to RestrictedAccess page"],
  },
  {
    id: "SCR-014",
    name: "Settings",
    path: "/settings",
    file: "/src/pages/Settings.tsx",
    description: "User preferences and system settings.",
    components: ["CMP-001", "CMP-002", "CMP-004"],
    roleAccess: ["engineer", "reviewer", "admin", "viewer"],
    uxDecisions: [
      "Settings grouped by category",
      "Changes saved with feedback toast",
    ],
    flows: [],
    edgeCases: ["Unsaved changes: prompt before navigation"],
  },
  {
    id: "SCR-015",
    name: "Banner Management",
    path: "/banners",
    file: "/src/pages/BannerManagement.tsx",
    description:
      "Admin tool for creating and managing system-wide announcement banners.",
    components: ["CMP-001", "CMP-002", "CMP-003", "CMP-004", "CMP-013"],
    roleAccess: ["admin"],
    uxDecisions: ["CRUD interface for banners", "Preview before publishing"],
    flows: [],
    edgeCases: ["Multiple active banners: show priority/ordering controls"],
  },
];

// ─── 4. USER FLOWS ───────────────────────────────────────────────────────────

export interface FlowEntry {
  id: string;
  name: string;
  description: string;
  steps: string[];
  screens: string[]; // SCR IDs
  components: string[]; // CMP IDs
  edgeCases: string[];
  permissions: string[];
}

export const USER_FLOWS: FlowEntry[] = [
  {
    id: "FLOW-001",
    name: "Authentication Flow",
    description: "User login, session management, and logout",
    steps: [
      "1. User navigates to app → redirected to /login if unauthenticated",
      "2. User enters username and password",
      "3. Client validates fields (non-empty)",
      "4. Login request sent (simulated 1.2s delay)",
      "5a. Success → session stored in sessionStorage → redirect to /",
      "5b. Failure → error banner shown → attempt counter incremented",
      "6. 3+ failures → security warning with IT contact suggestion",
      "7. Session restore: on app load, check sessionStorage for existing session",
      "8. Logout: clear sessionStorage → redirect to /login",
    ],
    screens: ["SCR-001"],
    components: ["CMP-004", "CMP-080"],
    edgeCases: [
      "Browser refresh: session restored from sessionStorage",
      "Session expiry: sessionExpired flag shows amber banner on login page",
      "Multiple tabs: sessionStorage is per-tab (intentional for security)",
    ],
    permissions: ["public"],
  },
  {
    id: "FLOW-002",
    name: "Dashboard Overview Flow",
    description:
      "User lands on dashboard and reviews KPIs before navigating to specific modules",
    steps: [
      "1. User logs in → lands on Dashboard",
      "2. Reviews stat widgets (approvals, cases, documents)",
      "3. Scans storage trend chart",
      "4. Reviews recent documents list",
      "5. Clicks on a pending approval → navigates to Approvals",
      "6. Or clicks Upload Document → initiates document ingestion",
    ],
    screens: ["SCR-002"],
    components: ["CMP-001", "CMP-002", "CMP-022", "CMP-090"],
    edgeCases: ["First-time user: all stats at 0, show welcome guidance"],
    permissions: ["engineer", "reviewer", "admin", "viewer"],
  },
  {
    id: "FLOW-003",
    name: "Document Browse & Preview Flow",
    description:
      "User browses documents, applies filters, and opens a document for detailed review",
    steps: [
      "1. User navigates to Documents (/documents)",
      "2. Toggles between list/grid view as preferred",
      "3. Uses search bar to filter by ID, name, or metadata",
      "4. Optionally toggles 'Show Obsolete' to include deprecated documents",
      "5. Clicks on a document row/card → navigates to /documents/:id",
      "6. Document opens in 3-column preview workspace",
      "7. Reviews document content in center preview",
      "8. Reviews metadata in right panel (properties, linked PL, OCR, history)",
      "9. Opens additional documents as tabs for comparison",
      "10. Closes tabs or navigates back to list",
    ],
    screens: ["SCR-003", "SCR-004"],
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-004",
      "CMP-020",
      "CMP-021",
      "CMP-030",
      "CMP-031",
      "CMP-032",
      "CMP-070",
      "CMP-081",
    ],
    edgeCases: [
      "Document not found: show error with back navigation",
      "All tabs closed: auto-navigate back to document list",
      "Large document: preview area supports zoom controls",
    ],
    permissions: ["engineer", "reviewer", "admin", "viewer"],
  },
  {
    id: "FLOW-004",
    name: "Search & Discovery Flow",
    description:
      "User searches across all entities (documents, PL, BOM) from the Search Explorer",
    steps: [
      "1. User navigates to Search (/search) or uses header search icon",
      "2. Enters query in the search input",
      "3. Results appear grouped by entity type with counts",
      "4. User clicks on a result → navigates to the entity detail page",
    ],
    screens: ["SCR-005"],
    components: ["CMP-001", "CMP-004", "CMP-020", "CMP-081"],
    edgeCases: [
      "Empty query: show recent searches",
      "No results: show refinement suggestions",
    ],
    permissions: ["engineer", "reviewer", "admin", "viewer"],
  },
  {
    id: "FLOW-005",
    name: "OCR Processing & Review Flow",
    description:
      "Document undergoes OCR processing, user monitors status and reviews results",
    steps: [
      "1. Document ingested → OCR job created automatically",
      "2. Job appears in OCR Monitor with 'Processing' status",
      "3. Processing completes → status changes to 'Completed' with confidence score",
      "4. If failed → status changes to 'Failed' with retry button",
      "5. User reviews confidence score in DocumentDetail metadata panel",
      "6. Low confidence (< 70%) → manual review flag set",
      "7. User can retry failed jobs from OCR Monitor",
    ],
    screens: ["SCR-004", "SCR-011"],
    components: ["CMP-003", "CMP-020", "CMP-032", "CMP-070"],
    edgeCases: [
      "OCR engine offline: show system alert in banner",
      "Very large document: show estimated processing time",
    ],
    permissions: ["engineer", "admin"],
  },
  {
    id: "FLOW-006",
    name: "PL Record Navigation Flow",
    description:
      "User browses and navigates Product Lifecycle records and their linked documents",
    steps: [
      "1. User navigates to PL Knowledge Hub (/pl)",
      "2. Browses PL records with status filtering",
      "3. Clicks on a PL record → navigates to /pl/:id",
      "4. Reviews PL details and linked documents",
      "5. Clicks on a linked document → navigates to /documents/:id",
    ],
    screens: ["SCR-006"],
    components: ["CMP-001", "CMP-002", "CMP-003", "CMP-020"],
    edgeCases: [
      "PL with no linked documents: show empty state with link suggestion",
    ],
    permissions: ["engineer", "reviewer", "admin"],
  },
  {
    id: "FLOW-007",
    name: "BOM Exploration Flow",
    description:
      "User navigates Bill of Materials hierarchy and reviews item details",
    steps: [
      "1. User navigates to BOM Explorer (/bom)",
      "2. Expands/collapses tree nodes to navigate hierarchy",
      "3. Selects a node → detail panel shows item properties",
      "4. Uses search to filter tree to matching items",
    ],
    screens: ["SCR-007"],
    components: ["CMP-001", "CMP-004", "CMP-021", "CMP-040"],
    edgeCases: [
      "Deep nesting: lazy load children",
      "Search with no matches: show empty state in tree",
    ],
    permissions: ["engineer", "admin"],
  },
  {
    id: "FLOW-008",
    name: "Case Management Flow",
    description: "User creates, tracks, and resolves cases linked to documents",
    steps: [
      "1. User navigates to Cases (/cases)",
      "2. Filters cases by status (Open, In Progress, Resolved)",
      "3. Clicks on a case → views case details",
      "4. Links case to relevant documents/PL records",
      "5. Updates case status and adds notes",
      "6. Resolves case → status changes to Resolved",
    ],
    screens: ["SCR-009"],
    components: ["CMP-001", "CMP-002", "CMP-003", "CMP-020", "CMP-070"],
    edgeCases: [
      "Unlinked case: prompt to link a document",
      "Case without assignee: show warning",
    ],
    permissions: ["engineer", "reviewer", "admin"],
  },
  {
    id: "FLOW-009",
    name: "Approval Workflow Flow",
    description:
      "Document submitted for approval, reviewer approves/rejects, status updates across system",
    steps: [
      "1. Document submitted for approval → appears in Approvals for designated reviewers",
      "2. Reviewer navigates to Approvals (/approvals)",
      "3. Reviews pending approval with document reference",
      "4. Clicks 'View Document' → opens in DocumentDetail",
      "5. Returns to Approvals → clicks Approve or Reject",
      "6. If Reject → provides rejection reason",
      "7. Document status updates across all views (Documents, Dashboard, PL)",
    ],
    screens: ["SCR-010", "SCR-004"],
    components: [
      "CMP-001",
      "CMP-002",
      "CMP-003",
      "CMP-020",
      "CMP-050",
      "CMP-070",
    ],
    edgeCases: [
      "Approval deadline approaching: show amber warning",
      "All approvals done: show success empty state",
    ],
    permissions: ["reviewer", "admin"],
  },
  {
    id: "FLOW-010",
    name: "Admin Configuration Flow",
    description:
      "Admin manages users, system settings, banners, and monitors system health",
    steps: [
      "1. Admin navigates to Admin Workspace (/admin)",
      "2. Manages user accounts (create, edit roles, deactivate)",
      "3. Configures system settings",
      "4. Monitors system health metrics",
      "5. Manages announcement banners via /banners",
    ],
    screens: ["SCR-013", "SCR-015"],
    components: ["CMP-001", "CMP-002", "CMP-004", "CMP-020", "CMP-060"],
    edgeCases: [
      "Non-admin tries to access: redirect to RestrictedAccess",
      "Destructive action: confirmation dialog required",
    ],
    permissions: ["admin"],
  },
];

// ─── 5. STATE MATRIX ─────────────────────────────────────────────────────────

export interface StateDefinition {
  name: string;
  description: string;
  visualTreatment: string;
  applicableTo: string[];
  example: string;
}

export const STATE_MATRIX: StateDefinition[] = [
  {
    name: "Default",
    description: "Normal resting state",
    visualTreatment: "Standard colors and borders as defined in tokens",
    applicableTo: ["All components"],
    example: "Button with teal gradient, input with teal-500/20 border",
  },
  {
    name: "Hover",
    description: "Mouse pointer is over the element",
    visualTreatment: "Slightly lighter bg, border intensifies, cursor:pointer",
    applicableTo: [
      "Buttons",
      "Cards",
      "Table rows",
      "Nav items",
      "Filter chips",
    ],
    example: "Button: from-teal-500 to-emerald-500; Card: border-teal-500/40",
  },
  {
    name: "Active/Pressed",
    description: "Element is being clicked/pressed",
    visualTreatment: "Slightly darker than hover, scale(0.98) optional",
    applicableTo: ["Buttons", "Nav items"],
    example: "Button slightly compressed",
  },
  {
    name: "Focus",
    description: "Element has keyboard focus",
    visualTreatment: "ring-1 ring-teal-400/50, border-teal-400/50",
    applicableTo: ["Inputs", "Buttons", "Nav items", "Tabs"],
    example: "Input with teal focus ring",
  },
  {
    name: "Disabled",
    description: "Element is non-interactive",
    visualTreatment: "opacity-50, cursor-not-allowed",
    applicableTo: ["Buttons", "Inputs", "Checkboxes"],
    example: "Submit button during form loading",
  },
  {
    name: "Selected",
    description: "Element is actively chosen from a set",
    visualTreatment: "bg-teal-500/10 or bg-teal-500/20, text-teal-300",
    applicableTo: [
      "Nav items",
      "Table rows",
      "Filter chips",
      "Tabs",
      "Tree nodes",
    ],
    example: "Active sidebar nav item with teal left indicator",
  },
  {
    name: "Loading",
    description: "Content or action is in progress",
    visualTreatment:
      "Loader2 animate-spin icon, opacity-50 on container, skeleton for content",
    applicableTo: ["Buttons", "Pages", "Data tables", "Cards"],
    example: "Login button showing spinner + 'Authenticating...'",
  },
  {
    name: "Empty",
    description: "No data available for the current context",
    visualTreatment: "Centered icon + headline + description + optional CTA",
    applicableTo: ["Tables", "Lists", "Search results", "Filter results"],
    example: "Documents page with no matching filter results",
  },
  {
    name: "Success",
    description: "Operation completed successfully",
    visualTreatment: "teal bg/border/text, CheckCircle icon",
    applicableTo: ["Badges", "Alerts", "Toast notifications"],
    example: "Document approved badge: bg-teal-900/50 text-teal-300",
  },
  {
    name: "Warning",
    description: "Attention needed but not critical",
    visualTreatment: "amber bg/border/text, AlertTriangle icon",
    applicableTo: ["Badges", "Alerts", "Deadline indicators"],
    example: "Approval deadline approaching: amber countdown",
  },
  {
    name: "Error",
    description: "Operation failed or validation error",
    visualTreatment: "rose bg/border/text, AlertCircle or XCircle icon",
    applicableTo: ["Badges", "Alerts", "Form validation", "OCR status"],
    example: "Login error: bg-rose-500/10 border-rose-500/30 text-rose-300",
  },
  {
    name: "Processing",
    description: "Background operation in progress",
    visualTreatment: "blue bg/border/text, animate-pulse on badge, Clock icon",
    applicableTo: ["Badges", "OCR status", "Approval pipeline"],
    example: "OCR Processing badge: bg-blue-900/50 animate-pulse",
  },
  {
    name: "Restricted",
    description: "User lacks permission for this area",
    visualTreatment:
      "Full-page message with Lock icon, 'Access Restricted' heading, role requirement explanation",
    applicableTo: ["Pages", "Admin sections"],
    example: "RestrictedAccess page shown for non-admin users",
  },
  {
    name: "Expired",
    description: "Session or deadline has passed",
    visualTreatment: "amber alert with Clock icon, explanation text",
    applicableTo: ["Session", "Approvals"],
    example: "Session expired banner on login page",
  },
];

// ─── 6. NAMING CONVENTIONS & GOVERNANCE ──────────────────────────────────────

export const NAMING_CONVENTIONS = {
  files: {
    pages:
      "PascalCase — e.g., DocumentDetail.tsx, OCRMonitor.tsx, PLKnowledgeHub.tsx",
    components:
      "PascalCase — e.g., GlassCard.tsx, Sidebar.tsx, NotificationPanel.tsx",
    libraries: "camelCase — e.g., auth.tsx, mock.ts, designSystem.ts",
    styles: "kebab-case — e.g., globals.css",
  },
  directories: {
    pages: "/src/pages/ — one file per route/screen",
    layoutComponents:
      "/src/components/layout/ — AppLayout, Header, Sidebar, NotificationPanel",
    sharedComponents:
      "/src/components/ui/ — Shared.tsx (GlassCard, Badge, Button, Input)",
    libraries: "/src/lib/ — auth, mock data, utilities, design system registry",
    routes: "/src/routes.ts — single router configuration file",
  },
  components: {
    pattern:
      "[Domain][Element] — e.g., DocumentCard, OCRConfidenceBar, ApprovalCard, BOMTree",
    prefixes: "No prefixes — rely on directory structure for namespacing",
    exports:
      "Named exports for shared components. Default exports for page components.",
  },
  designTokens: {
    colors:
      "[category]-[shade] — e.g., brand-primary, status-success, surface-raised",
    spacing: "space-[n] — e.g., space-4 (16px)",
    radii: "[size] — e.g., sm, md, lg, xl, full, pill",
    elevation: "[context] — e.g., card, cardHeavy, nav, button, brand",
  },
  componentIds: "CMP-[NNN] — e.g., CMP-001 (GlassCard), CMP-002 (Button)",
  screenIds: "SCR-[NNN] — e.g., SCR-001 (Login), SCR-002 (Dashboard)",
  flowIds:
    "FLOW-[NNN] — e.g., FLOW-001 (Authentication), FLOW-003 (Document Browse)",
  cssClasses: {
    customUtilities:
      "kebab-case — e.g., gradient-sidebar, custom-scrollbar, active-indicator",
    tailwindPreference:
      "Always prefer Tailwind utility classes over custom CSS. Custom CSS only for animations and scrollbar styling.",
  },
  governance: {
    deprecation:
      "Move deprecated components to a clearly marked 'Deprecated' section in the registry. Add deprecation date and replacement component ID. Keep for 2 release cycles before removal.",
    newComponents:
      "1. Add entry to COMPONENT_INVENTORY with full metadata. 2. Map to screens in SCREEN_MAP. 3. Document in relevant flows in USER_FLOWS. 4. Add states to STATE_MATRIX if new states introduced.",
    changeProcess:
      "1. Update the component entry in designSystem.ts. 2. Update all screen mappings that use the component. 3. Note the change date and rationale in uxNotes.",
    versionTracking:
      "Component changes tracked via Git history on designSystem.ts. Major changes should include a comment with date and rationale.",
  },
};

// ─── 7. FIGMA FILE STRUCTURE RECOMMENDATION ──────────────────────────────────

export const FIGMA_FILE_STRUCTURE = {
  description:
    "Recommended Figma file/page organization for LDO-2 EDMS design system",
  files: [
    {
      name: "LDO-2 Design System — Foundations",
      pages: [
        {
          name: "Cover",
          purpose: "File cover with version, last updated, owner",
        },
        {
          name: "Color System",
          purpose:
            "All color tokens: brand, surface, text, status, border, glow. Show light/dark contrast ratios.",
        },
        {
          name: "Typography",
          purpose:
            "Type scale, font weights, text size control range. Show each size in context.",
        },
        {
          name: "Spacing & Grid",
          purpose:
            "Spacing scale, page layout dimensions, sidebar/header/banner measurements.",
        },
        {
          name: "Radius & Elevation",
          purpose:
            "Border radius scale with visual examples. Shadow/elevation tokens.",
        },
        {
          name: "Glassmorphism",
          purpose:
            "Standard and heavy glass effect specifications. Blur, opacity, border, radius combos.",
        },
        {
          name: "Iconography",
          purpose:
            "Icon sizing rules (w-5 h-5 standard, w-4 h-4 compact). Lucide icon inventory used across the system.",
        },
        {
          name: "Accessibility",
          purpose:
            "Contrast ratios, focus ring specs, keyboard navigation patterns, text scaling behavior.",
        },
        {
          name: "Status Colors",
          purpose:
            "Semantic color matrix: success/warning/danger/info/neutral/processing with bg/border/text triplets.",
        },
      ],
    },
    {
      name: "LDO-2 Design System — Components",
      pages: [
        { name: "Cover", purpose: "File cover" },
        {
          name: "Buttons",
          purpose:
            "All button variants (Primary/Secondary/Ghost/Danger), states, sizes. Do/don't guidance.",
        },
        {
          name: "Inputs & Forms",
          purpose:
            "Text input, search input with icon, textarea, select, checkbox, toggle. All states.",
        },
        {
          name: "Badges & Chips",
          purpose:
            "Status badges (5 variants), filter chips (active/inactive). All states.",
        },
        {
          name: "Cards & Surfaces",
          purpose:
            "GlassCard standard/heavy. Stat widget cards. Document cards (grid view).",
        },
        {
          name: "Tables",
          purpose:
            "Data table header, rows, hover state, selected state, empty state, loading state.",
        },
        {
          name: "Navigation — Sidebar",
          purpose:
            "Collapsed/expanded states, nav items, group headers, active indicator animation.",
        },
        {
          name: "Navigation — Header",
          purpose:
            "Breadcrumb, toolbar icons, notification bell, text size controls, profile dropdown.",
        },
        {
          name: "Navigation — Tabs",
          purpose: "Document tabs (in preview), filter tabs, page tabs.",
        },
        {
          name: "Alerts & Feedback",
          purpose:
            "Error/warning/info/success banners. Toast notifications. Empty states. Loading spinners.",
        },
        {
          name: "Dialogs & Drawers",
          purpose: "Confirmation dialogs, detail drawers, modal overlays.",
        },
        {
          name: "Domain — Document",
          purpose:
            "Document card, preview layout, metadata panel, OCR confidence bar, revision history.",
        },
        {
          name: "Domain — BOM",
          purpose: "BOM tree node, tree hierarchy, detail panel.",
        },
        {
          name: "Domain — Approval",
          purpose:
            "Approval card variants (pending/completed/rejected), action buttons.",
        },
        {
          name: "Domain — Admin",
          purpose:
            "Admin widgets, user management cards, system health indicators.",
        },
        {
          name: "Charts",
          purpose:
            "Area chart, bar chart styling specs. Tooltip, grid, axis styling.",
        },
        {
          name: "Announcement Banner",
          purpose:
            "System banner variants (info/warning/critical). Dismiss behavior.",
        },
      ],
    },
    {
      name: "LDO-2 Design System — Patterns",
      pages: [
        { name: "Cover", purpose: "File cover" },
        {
          name: "Page Layout",
          purpose:
            "Standard page structure: banner + sidebar + header + content. Measurements and responsive behavior.",
        },
        {
          name: "3-Column Workspace",
          purpose:
            "Document preview layout: tab bar + preview + metadata. Panel proportions.",
        },
        {
          name: "List/Grid Toggle",
          purpose:
            "Pattern for switching between list and grid views (Documents, PL).",
        },
        {
          name: "Filter Bar",
          purpose:
            "Search + filter chips + view toggle + action buttons pattern.",
        },
        {
          name: "Stat Widget Row",
          purpose: "3-4 KPI widgets in a responsive grid.",
        },
        {
          name: "Detail Panel",
          purpose:
            "Right-side metadata panel pattern used in DocumentDetail, BOM, PL.",
        },
        {
          name: "Tree Navigation",
          purpose:
            "Hierarchical tree pattern with expand/collapse, search, detail panel.",
        },
        {
          name: "Role-Based Visibility",
          purpose: "How components appear/hide based on user role.",
        },
        {
          name: "Error Recovery",
          purpose:
            "Loading → Error → Retry patterns. Session expiry → Re-auth.",
        },
      ],
    },
    {
      name: "LDO-2 Screens — All Modules",
      pages: [
        { name: "Cover", purpose: "File cover" },
        {
          name: "Login",
          purpose:
            "Login screen with all states: default, loading, error, session expired, 3+ failures.",
        },
        {
          name: "Dashboard",
          purpose: "Dashboard with stat widgets, chart, recent documents.",
        },
        {
          name: "Documents — List",
          purpose: "Document repository in list view with filters.",
        },
        {
          name: "Documents — Grid",
          purpose: "Document repository in grid view.",
        },
        {
          name: "Document Detail",
          purpose: "3-column document preview workspace.",
        },
        { name: "Search Explorer", purpose: "Global search with results." },
        { name: "PL Knowledge Hub", purpose: "PL records browser." },
        {
          name: "PL Detail",
          purpose: "PL record detail with linked documents.",
        },
        { name: "BOM Explorer", purpose: "BOM tree with detail panel." },
        { name: "Work Ledger", purpose: "Work/time tracking table." },
        { name: "Ledger Reports", purpose: "Ledger analytics and reports." },
        { name: "Cases", purpose: "Case management list." },
        { name: "Approvals", purpose: "Approval queue with actions." },
        { name: "Reports", purpose: "Reports dashboard." },
        { name: "OCR Monitor", purpose: "OCR pipeline status." },
        { name: "Audit Log", purpose: "System audit trail." },
        { name: "Admin Workspace", purpose: "Admin dashboard." },
        { name: "Settings", purpose: "User/system settings." },
        { name: "Banner Management", purpose: "Announcement banner CRUD." },
        { name: "Restricted Access", purpose: "Permission denied page." },
      ],
    },
    {
      name: "LDO-2 Flows & UX Documentation",
      pages: [
        { name: "Cover", purpose: "File cover" },
        {
          name: "Flow — Authentication",
          purpose: "Login/logout/session flow diagram with all states.",
        },
        {
          name: "Flow — Document Browse & Preview",
          purpose: "Document discovery to preview workflow.",
        },
        {
          name: "Flow — OCR Processing",
          purpose: "Document ingestion → OCR → review pipeline.",
        },
        {
          name: "Flow — Approval Workflow",
          purpose: "Submit → review → approve/reject lifecycle.",
        },
        {
          name: "Flow — Search & Discovery",
          purpose: "Cross-entity search workflow.",
        },
        {
          name: "Flow — BOM Navigation",
          purpose: "Tree exploration and detail review.",
        },
        {
          name: "Flow — Case Management",
          purpose: "Case creation, linking, resolution.",
        },
        {
          name: "Flow — Admin Operations",
          purpose: "User management, settings, banner management.",
        },
        {
          name: "UX Decisions Log",
          purpose:
            "Documented rationale for all major UX decisions with dates.",
        },
        {
          name: "Edge Cases Matrix",
          purpose: "All edge cases mapped to screens and flows.",
        },
        {
          name: "State Reference",
          purpose: "Visual reference for all 14 interaction/data states.",
        },
      ],
    },
    {
      name: "LDO-2 Handoff & Archive",
      pages: [
        { name: "Cover", purpose: "File cover" },
        {
          name: "Developer Handoff Guide",
          purpose:
            "How to read the design system. Token-to-code mapping. Component prop reference.",
        },
        {
          name: "Component-Screen Matrix",
          purpose:
            "Visual matrix showing which components are used on which screens.",
        },
        {
          name: "Responsive Specs",
          purpose: "Breakpoint behavior, sidebar collapse, grid adjustments.",
        },
        {
          name: "Animation Specs",
          purpose:
            "Motion library usage. Sidebar expand, nav indicator, badge pulse.",
        },
        {
          name: "Deprecated Archive",
          purpose:
            "Old components/patterns with deprecation dates and replacement references.",
        },
      ],
    },
  ],
};
