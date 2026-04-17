# LDO-2 Codebase Analysis — Dependencies, Structure & Cleanup

## Architecture Overview

```
LDO-2-local/
├── index.html              ← Vite entry point
├── src/                    ← Frontend source (active)
│   ├── main.tsx            ← React root (imports App + index.css)
│   ├── App.tsx             ← Imports src/src/routes.ts + src/src/lib/auth.tsx
│   ├── index.css           ← Imports tailwindcss + styles/globals.css
│   ├── styles/globals.css  ← Theme CSS variables + component classes
│   ├── test/               ← Vitest setup + smoke tests
│   └── src/                ← ⚠️ Nested source (the REAL app code)
│       ├── routes.ts       ← React Router config (all page imports)
│       ├── components/
│       │   ├── layout/     ← AppLayout, Header, Sidebar, NotificationPanel
│       │   └── ui/         ← Shared.tsx, Skeleton.tsx
│       ├── lib/            ← auth.tsx, mock.ts, bomData.ts, designSystem.ts
│       └── pages/          ← 21 page components
├── artifacts/              ← pnpm workspace packages
│   ├── edms/               ← Main frontend app (Vite + React + Radix/shadcn)
│   ├── api-server/         ← Express mock API server
│   └── mockup-sandbox/     ← UI prototyping sandbox (NOT production)
├── lib/                    ← Shared workspace libraries
│   ├── api-spec/           ← OpenAPI spec + Orval config
│   ├── api-client-react/   ← Generated React Query hooks
│   ├── api-zod/            ← Generated Zod schemas
│   └── db/                 ← ⚠️ Drizzle ORM config (UNUSED — backend uses Django)
├── backend/                ← Django REST API
│   ├── edms/               ← Django project settings
│   ├── edms_api/           ← Main API app (documents, OCR)
│   ├── documents/          ← Document indexing app
│   ├── work/               ← Workflow/approval app
│   ├── config_mgmt/        ← Change management app
│   ├── integrations/       ← Email, S3, webhooks
│   ├── shared/             ← Cross-cutting concerns (middleware, permissions, cache)
│   ├── services/           ← Business logic services
│   └── tests/              ← Backend test suite
└── scripts/                ← DevOps scripts
```

## Active Dependency Chain

```
index.html
  └─→ src/main.tsx
        ├─→ src/App.tsx
        │     ├─→ src/src/routes.ts ──→ All 21 pages
        │     │                       ──→ src/src/components/layout/AppLayout.tsx
        │     │                       ──→ src/src/components/layout/Sidebar.tsx
        │     │                       ──→ src/src/components/layout/Header.tsx
        │     └─→ src/src/lib/auth.tsx
        └─→ src/index.css
              └─→ src/styles/globals.css (theme variables + component classes)
```

## Critical Issue: Dual Frontend Structure

The project has TWO overlapping frontend source trees:

| Path | Purpose | Status |
|------|---------|--------|
| `src/` (root-level components) | Original prototype (state-based nav) | **DEAD CODE** |
| `src/src/` (nested components) | Active app (react-router) | **ACTIVE** |
| `artifacts/edms/src/` | Full-featured app with 22 services, contexts, hooks | **PRIMARY** |
| `artifacts/mockup-sandbox/` | UI prototyping sandbox | **DEV-ONLY** |

The `src/components/` directory is an OLD prototype using state-based navigation
(`useState("dashboard")`). It is NOT imported by the active `App.tsx`. The active
code lives in `src/src/` and uses `react-router`.

Meanwhile, `artifacts/edms/src/` contains a MUCH more complete version with:
- 22 service classes (DocumentService, PLService, etc.)
- React contexts (ThemeContext, ToastContext, etc.)
- Custom hooks (useDocuments, useCases, etc.)
- Full shadcn/ui component library
- 35 pages vs the 21 in `src/src/pages/`

The `src/src/` code appears to be a SIMPLIFIED copy that uses mock data instead
of real API calls. The `artifacts/edms/src/` code uses the generated API client.

## Workspace Package Dependencies

```
@workspace/edms (artifacts/edms)
  └─→ @workspace/api-client-react (lib/api-client-react)
        └─→ @tanstack/react-query
        └─→ @workspace/api-zod (lib/api-zod) [implicit]

@workspace/api-server (artifacts/api-server)
  └─→ (standalone Express mock server)

@workspace/mockup-sandbox (artifacts/mockup-sandbox)
  └─→ (standalone, duplicates all Radix/shadcn deps)
```

## Redundant / Dead Code Inventory

### 🔴 REMOVE — Dead code, stubs, and clutter

| Path | Reason |
|------|--------|
| `src/components/Layout.tsx` | Old prototype, superseded by `src/src/components/layout/AppLayout.tsx` |
| `src/components/Sidebar.tsx` | Old sidebar (5 items), superseded by `src/src/components/layout/Sidebar.tsx` |
| `src/components/Dashboard.tsx` | Old dashboard, superseded by `src/src/pages/Dashboard.tsx` |
| `src/components/Documents.tsx` | Old documents page, superseded by `src/src/pages/Documents.tsx` |
| `src/components/StorageAnalytics.tsx` | Old analytics, not imported anywhere |
| `src/components/StorageOverviewCard.tsx` | Old card, not imported anywhere |
| `src/components/QuickActions.tsx` | Old actions, not imported anywhere |
| `src/components/RecentFilesList.tsx` | Old list, not imported anywhere |
| `src/components/ActivityFeed.tsx` | Old feed, not imported anywhere |
| `src/components/figma/` | Design tokens, not imported by any code |
| `src/components/ui/` (49 files) | Full shadcn/ui copy. DUPLICATED in `artifacts/edms/src/components/ui/`. NOT imported by `src/src/` code |
| `FileProcessor/` | 5-line stub with wrong DB name, not referenced anywhere |
| `pin_node_packages.js` | One-time utility, not part of build |
| `test_script.py` | Root-level test with wrong Django settings, belongs in backend/tests/ |
| `pencil-new.pen` | Design tool file, not code |
| `src/src/pages/Placeholder.tsx` | Empty placeholder, not in routes.ts |
| `lib/db/` | Drizzle ORM config — backend uses Django ORM, not Drizzle |

### 🟡 MOVE — Misplaced files

| Path | Destination | Reason |
|------|-------------|--------|
| `edit-pl-3col.png`, `edit-pl-3col-bottom.png`, `edit-pl-text-stable.png` | `docs/mockups/` | Design mockup screenshots |
| `login-logo.png`, `sidebar-logo.png` | `artifacts/edms/public/` | App assets |
| 10+ `PHASE_*.md` + `*_AUDIT.md` files | `docs/audits/` | Historical audit reports cluttering root |

### 🟢 KEEP — Active dependencies

| Path | Reason |
|------|--------|
| `lib/api-spec/` | OpenAPI spec → generates api-client-react + api-zod |
| `lib/api-client-react/` | Generated React Query hooks, used by artifacts/edms |
| `lib/api-zod/` | Generated Zod schemas for type-safe API calls |
| `artifacts/api-server/` | Express mock API for development |
| `artifacts/mockup-sandbox/` | UI prototyping (dev-only, but useful) |
| `src/guidelines/` | Design guidelines reference |
| `src/src/lib/mock.ts` | Mock data used by current pages |
| `src/src/lib/auth.tsx` | Auth provider used by App.tsx |

## Recommended Integration Path

The `src/src/` (simplified mock version) and `artifacts/edms/src/` (full API version)
need to be consolidated:

1. **Short term:** ✅ Keep `src/src/` as the dev sandbox (mock data), remove `src/components/` **DONE**
2. **Medium term:** Migrate pages from `src/src/pages/` to use `@workspace/api-client-react`
   hooks instead of mock data, making `artifacts/edms/` the single source of truth
3. **Long term:** Flatten `src/src/` into `src/` and make `artifacts/edms/` the build target

---

## Cleanup Actions Completed

### Removed (Dead Code)
- `src/components/` — 9 old prototype components (Layout, Sidebar, Dashboard, etc.)
- `src/components/ui/` — 49 duplicated shadcn/ui files (available in artifacts/edms)
- `src/components/figma/` — Design token file
- `src/src/pages/Placeholder.tsx` — Empty placeholder not in router
- `FileProcessor/` — 5-line stub with wrong DB name
- `lib/db/` — Drizzle ORM (unused; backend uses Django ORM)
- `pin_node_packages.js` — One-time utility
- `test_script.py` — Root-level test with wrong Django settings
- `pencil-new.pen` — Design tool file
- `skills-lock.json` — Replit artifact

### Moved (Misplaced Files)
- `edit-pl-3col*.png`, `edit-pl-text-stable.png` → `docs/mockups/`
- `login-logo.png`, `sidebar-logo.png` → `artifacts/edms/public/`
- 19 audit/phase MD files → `docs/audits/`
- `DEPLOYMENT.md`, `replit.md` → `docs/audits/`

### Root Directory (After Cleanup)
```
.env.example  .gitignore  .npmrc  .replit
CODEBASE_ANALYSIS.md  IMPROVEMENT_PLAN.md  README.md  LICENSE
docker-compose.yml  Dockerfile.backend  Dockerfile.frontend
index.html  package.json  pnpm-lock.yaml  pnpm-workspace.yaml
tsconfig.base.json  tsconfig.json  vite.config.ts  vitest.config.ts
```

### Build Verification
✅ `pnpm build` succeeds — no broken imports from cleanup
