# Workspace

> Archived reference: this document reflects an earlier Replit-oriented workspace snapshot. For the current repo structure and active stack, use the root `README.md`.

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## LDO-2 EDMS (`artifacts/edms`)

Enterprise Document Management System for engineering documents, BOMs, and approvals.

### Key Details
- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS v4 — dark teal glass-morphism theme (slate-950 bg, teal-500/emerald gradients)
- **Routing**: react-router v7 with `createBrowserRouter`
- **Auth**: In-memory mock auth (`src/lib/auth.tsx`) — demo credentials: admin/admin123, a.kowalski/ldo2pass, m.chen/ldo2pass, s.patel/ldo2pass
- **Data**: All mock/in-memory, no real backend. Main data files: `src/lib/mock.ts`, `src/lib/mockExtended.ts`, `src/lib/bomData.ts`
- **Animation**: Framer Motion (`motion`) for sidebar and UI

### Pages (21 total)
`Login`, `Dashboard`, `DocumentHub`, `DocumentDetail`, `DocumentIngestion`, `BOMExplorer`, `BOMProductView`, `PLKnowledgeHub`, `PLDetail`, `WorkLedger`, `LedgerReports`, `Cases`, `Approvals`, `Reports`, `AdminWorkspace`, `OCRMonitor`, `AuditLog`, `Settings`, `BannerManagement`, `RestrictedAccess`, `DesignSystem`, `SearchExplorer`

### Service Layer (`src/services/`)
- `DocumentService.ts` — wraps MOCK_DOCUMENTS, seeds rich ocrText for 3 key docs
- `PLService.ts` — merges PL_DATABASE (50+ entries) + MOCK_PL_RECORDS into PLNumber type
- `WorkLedgerService.ts` — KPI, analytics, dedup; seeds 5 rich extra records; delete/verify/update methods
- `SearchService.ts` — cross-entity search across docs/PL/work/cases

### Custom Hooks (`src/hooks/`)
- `useDocuments.ts`, `usePLItems.ts`, `useWorkRecords.ts` (with remove), `useCases.ts`

### Pages (27 total)
`Login`, `Dashboard`, `DocumentHub`, `DocumentDetail`, `DocumentIngestion`, `BOMExplorer`, `BOMProductView`, `PLKnowledgeHub`, `PLDetail`, `WorkLedger`, `LedgerReports`, `Cases`, `Approvals`, `Reports`, `AdminWorkspace`, `OCRMonitor`, `AuditLog`, `Settings`, `BannerManagement`, `RestrictedAccess`, `DesignSystem`, `SearchExplorer`, `AlertRules`, `DocumentTemplates`, `SystemHealth`

### Feature Set (all complete)
- **T001 Export/Import**: xlsx-powered CSV + Excel export/import in WorkLedger + DocumentHub. Import modal with drag-drop, preview table, template download.
- **T002 Theme Toggle**: Sun/Moon button in Header; persists to localStorage via PreferencesService; full light-mode class applied to `<html>`.
- **T003 Command Palette**: `CommandPalette.tsx` — Cmd+K/Ctrl+K opens palette with all pages, recent actions, keyboard navigation (↑↓ arrows, Enter to navigate).
- **T004 Search Enhancements**: SearchExplorer with history (localStorage), saved searches, full-text across all entities + OCR text, faceted filter panel (status, date range, entity type toggles).
- **T005 Table Enhancements**: DocumentHub: column visibility toggle menu, clickable sort headers, pagination (15/page). WorkLedger: "Show Mine" + "Show Overdue" quick filter pills, copy-to-clipboard, sort, pagination (20/page).
- **T006 User Preferences**: `PreferencesService.ts` → Sidebar expanded state read/saved; last visited path saved on every navigation → restored after login; theme persisted across sessions.
- **T007 KPI Drill-Down**: Dashboard KPI cards expand on click with detailed metrics + trend indicators (↑/↓). LedgerReports has BarChart + PieChart + avg completion trend.
- **T008 Version Control UI**: DocumentDetail `history` section → revision timeline with date/author/note per rev, "Compare with Current" and "Rollback" action buttons.
- **T009 Alert Rules**: `AlertRules.tsx` — create/edit/toggle/delete rules, 4 trigger types (Overdue, Status Change, Threshold, Scheduled), channel config (In-App/Email/Both).
- **T010 Audit Log Enhancement**: Filter by module/severity/user/date range + keyword search. Paginated (20/page). XLSX export. Click row → detail modal.
- **T011 Document Templates**: Template gallery with category tabs (Maintenance/Engineering/Quality/Cases/HR), starred favourites, "Use Template" → prefilled modal with all fields.
- **T012 System Health Dashboard**: Service status tiles (6 services), Area charts for CPU/Memory/Disk over 20 min, slow query table, backup schedule — all under Admin.
- **T013 Pagination**: WorkLedger + DocumentHub both have page controls at bottom with prev/next + page number buttons.

### Service Layer (`src/services/`)
- `DocumentService.ts` — wraps MOCK_DOCUMENTS, seeds rich ocrText for 3 key docs
- `PLService.ts` — merges PL_DATABASE (50+ entries) + MOCK_PL_RECORDS into PLNumber type
- `WorkLedgerService.ts` — KPI, analytics, dedup; seeds 5 rich extra records; delete/verify/update methods
- `SearchService.ts` — cross-entity search across docs/PL/work/cases
- `ExportImportService.ts` — xlsx-based CSV/Excel export + import parsing
- `SearchHistoryService.ts` — search history + frequency tracking in localStorage
- `FullTextSearchService.ts` — extended full-text search including OCR content
- `PreferencesService.ts` — user preferences persistence (theme, sidebar state, last path)

### Port Configuration
| Service | Port | Notes |
|---------|------|-------|
| Frontend (Vite dev) | System-assigned (default 4173 standalone) | PORT env injected by Replit |
| Main Backend API | 8420 (default, `${PORT:-8420}`) | Registered artifact |
| Auth Service | 8421 | If split from main API |
| Webhooks | 8422 | Payment/notification hooks |
| Database | 5432 | Postgres default |

### Key Page Features (as built)
- **DocumentHub**: Sortable columns, column visibility toggle, category filter, linked PL icon, stat cards, export CSV/Excel, pagination
- **DocumentDetail**: OCR full-text viewer with search highlight + copy, detected references with PL/doc links, related docs panel, viewer toolbar, revision history timeline with compare/rollback
- **PLKnowledgeHub**: 50+ records from PLService, status/category/safety filters, Create PL Record modal with 8-digit validation, safety vital toggle
- **WorkLedger**: KPI stat cards, analytics panel (bar charts), "Show Mine"/"Show Overdue" quick pills, Create modal with category→type cascade + auto target days + duplicate detection + e-office fields, immutable VERIFIED records, export/import
- **SearchExplorer**: Debounced cross-entity search, scope tabs (ALL/DOCUMENTS/PL/WORK/CASES), OCR snippet highlighting, search history (localStorage), saved searches, faceted filter panel

### BOM Data Structure (expanded)
- `PL_DATABASE`: 40+ PL records across 4 products — WAP7 (38xxxxx), WAG-9HC (46xxxxx), DETC (52xxxxx), Traction Motor (60xxxxx)
- `PRODUCTS`: Array of 4 product catalog entries with id, name, category, lifecycle, rootPL, stats
- `BOM_TREES`: Map of `productId → BOMNode[]` for wap7, wag9hc, detc, tractionmotor
- `INITIAL_BOM_TREE` / `WAG9HC_BOM_TREE` / `DETC_BOM_TREE` / `TRACTION_MOTOR_BOM_TREE`: Hierarchical trees
- Utilities: `findNode`, `searchTree`, `countNodes`, `cloneTree`, `removeNode`

### Routing
- `/bom` — BOM Explorer product catalog (ENGINEER_UP)
- `/bom/:productId` — Per-product BOM tree with DnD (ENGINEER_UP)
- `/documents/ingest` — Document Ingestion form (ALL_ROLES)

### Design System
- **Fonts**: DM Sans (UI text) + IBM Plex Mono (codes/IDs) via Google Fonts in index.css
- **Glass cards**: `glass-card` CSS utility — `bg-slate-900/50 backdrop-blur-xl border border-white/6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]`
- **Filter pills**: `.pill-filter`, `.pill-filter-active`, `.pill-filter-inactive` CSS utilities
- **Page transitions**: Framer Motion AnimatePresence fade (100ms) in AppLayout
- **BOM drag-and-drop**: react-dnd v16 with HTML5Backend, GripVertical handles, hover-based reorder

### Role-based Access
- `admin`: Full access to all pages including Admin, Banners, Audit
- `engineer`: Documents, BOM, PL Hub, Work Ledger, Cases
- `reviewer`: Documents, Approvals, Cases
- `supervisor`: All except Admin/Banners

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   └── api-zod/            # Generated Zod schemas from OpenAPI
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles the mock API runtime and externalizes the rest

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any current workspace package by adding it as a dependency in `scripts/package.json`.
