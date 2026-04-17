# LDO-2 Codebase Improvement Plan & Progress

## Overview

Comprehensive review and improvement of the LDO-2 EDMS codebase across 6 categories: bug fixes, new features, codebase understanding, deployment, UI/UX improvements, and code review/refactoring.

---

## Phase 1: Critical Bug Fixes ✅ (COMPLETED)

### 1.1 Race Conditions in State Transitions ✅
**Files:** `backend/work/services.py`, `backend/config_mgmt/services.py`

**Problem:** All state transition methods checked status on a stale instance, allowing concurrent requests to double-approve or double-close.

**Fix:** Added `select_for_update()` row-level locking inside `@transaction.atomic` blocks for:
- `ApprovalService.approve()` and `reject()`
- `CaseService.close()`
- `ChangeRequestService.submit()`, `approve()`, `reject()`, `implement()`
- `ChangeNoticeService.approve()`, `release()`, `close()`

### 1.2 JWT Token Lifetime Too Long ✅
**File:** `backend/edms/settings_api.py`

**Fix:** Reduced access token from 24h → 15min. Refresh token: 2 days. Removed duplicate `JTI_CLAIM` key.

### 1.3 CORS Placeholder Domain ✅
**File:** `backend/edms/settings_api.py`

**Fix:** Removed `https://edms.example.com`. Added `localhost:5173` (Vite dev server).

### 1.4 Middleware Tenant/Plant Spoofing ✅
**File:** `backend/shared/middleware.py`

**Fix:** Tenant/plant now derived from verified JWT claims. Client headers trigger spoof warning logs.

### 1.5 Celery Task Timeouts ✅
**File:** `backend/edms/settings.py`

**Fix:** Added `CELERY_TASK_TIME_LIMIT=300s`, `CELERY_TASK_SOFT_TIME_LIMIT=240s`, and queue routing.

### 1.6 Permission Logging ✅
**File:** `backend/shared/permissions.py`

**Fix:** Improved exception logging in `scope_queryset`.

---

## Phase 2: Backend Hardening ✅ (COMPLETED)

### 2.1 OCR Task Celery Registration ✅
**Files:** `backend/edms_api/tasks.py` (NEW), `backend/edms_api/ocr_tasks.py`

**Problem:** `setup_celery_tasks()` was called inside `start_ocr_for_document()` on every invocation, creating duplicate task registrations and potential race conditions.

**Fix:**
- Created `edms_api/tasks.py` with proper `@shared_task` decorator at module level
- Task includes retry logic (max 2 retries, 30s backoff), soft/hard time limits
- Updated `ocr_tasks.py` to import from `tasks.py` instead of registering inline
- Celery worker now uses `-Q default,ocr,indexing,notifications` for queue separation

### 2.2 Caching Utilities ✅
**File:** `backend/shared/cache.py` (NEW)

**Added:**
- `cache_key()` — deterministic key generation with MD5 hash
- `get_cached()` / `set_cached()` — simple get/set wrappers
- `invalidate_prefix()` — pattern-based invalidation (Redis `delete_pattern`)
- `invalidate_key()` — single key deletion
- `cached_view()` — decorator for DRF list views with automatic cache key from query params + user ID

### 2.3 API Response Format Standardization ✅
**File:** `backend/shared/responses.py` (NEW)

**Added:**
- `success_response()` — wraps data in `{ "status": "success", "data": ..., "meta": { "correlation_id": ... } }`
- `success_paginated()` — wraps paginated data with pagination metadata
- `accepted_response()` — 202 Accepted for async operations (OCR, exports)

### 2.4 PgBouncer Connection Pooling ✅
**File:** `docker-compose.yml`

**Added:**
- PgBouncer service with transaction-mode pooling
- All services (backend, celery_worker, celery_beat) now connect via PgBouncer (`@pgbouncer:5432`)
- Pool config: 200 max client connections, 25 default pool size, 5 reserve
- Health check on PgBouncer before dependent services start

---

## Phase 3: Frontend Consolidation (PENDING)

### 3.1 Resolve Dual Frontend Structure
The project has two frontend source directories:
- `src/` — contains `App.tsx`, `main.tsx`, `index.css`
- `src/src/` — contains the actual components, layouts, pages

**Action:** Move all components from `src/src/` to `src/` and update imports.

### 3.2 Wire Up API Client
- `lib/api-client-react/` has generated React Query hooks but they're not used
- Replace mock service calls with actual React Query hooks

### 3.3 Shared Component Library
- Consolidate `src/components/` and `src/src/components/ui/` into single location

---

## Phase 4: Testing & Quality ✅ (PARTIALLY COMPLETED)

### 4.1 CI/CD Pipeline ✅
**File:** `.github/workflows/ci.yml` (NEW)

**Added GitHub Actions workflow with 4 jobs:**
1. **backend** — Python setup → pip install → migration check → pytest with coverage → artifact upload
2. **frontend** — Node setup → pnpm install → type check → build → lint
3. **docker** — Build backend + frontend Docker images (on push only)
4. **deploy-staging** — Placeholder for staging deployment (main branch only)

### 4.2 Database Backup Strategy ✅
**File:** `scripts/backup-db.sh` (NEW)

**Features:**
- `pg_dump` with gzip compression and SHA256 checksums
- Automatic cleanup of backups older than `RETENTION_DAYS` (default 30)
- `--verify` mode: gzip integrity + SHA256 checksum + table count verification
- `--restore` mode: drop/recreate DB + restore from backup (with confirmation prompt)
- Configurable via environment variables

### 4.3 Backend Test Coverage (REMAINING)
- Add tests for state transition race conditions
- Add permission scoping tests (tenant isolation)
- Add OCR job lifecycle tests

### 4.4 Frontend Testing (REMAINING)
- Add Vitest + React Testing Library
- Write smoke tests for critical paths

### 4.5 Linting & Type Safety (REMAINING)
- Add ESLint configuration
- Add `strict: true` to tsconfig.json

---

## Phase 5: UI/UX Improvements ✅ (COMPLETED)

### 5.1 Light Theme ✅
**Files:** `src/styles/globals.css`, `src/src/components/layout/Header.tsx`, `src/src/components/ui/Shared.tsx`

**Completed:**
- Full light theme CSS variable overrides in `.light-theme` class
- Theme toggle in Header with localStorage persistence (`ldo2-theme` key)
- Theme-aware component classes: `.glass-card`, `.badge-*`, `.btn-*`, `.input-base`, `.stat-*`
- Safari `-webkit-backdrop-filter` prefix
- Smooth 250ms transitions between themes
- Confirmed: no hardcoded dark colors (`text-white`, `bg-slate-900`, etc.) in components

### 5.2 Remaining UI Polish
- Consistent 8px spacing grid enforcement
- Sticky table headers
- Skeleton loading states (replace spinner-only)
- Help/tooltip system for status badges and action buttons

---

## Files Modified / Created

| File | Status | Change |
|------|--------|--------|
| `backend/work/services.py` | Modified | `select_for_update()` on approve/reject/close |
| `backend/config_mgmt/services.py` | Modified | `select_for_update()` on all state transitions |
| `backend/edms/settings_api.py` | Modified | JWT lifetimes, CORS fix, duplicate key removal |
| `backend/edms/settings.py` | Modified | Celery timeouts + queue routing |
| `backend/shared/middleware.py` | Modified | JWT-based tenant/plant extraction |
| `backend/shared/permissions.py` | Modified | Improved exception logging |
| `backend/edms_api/tasks.py` | **NEW** | Proper Celery task with retries and time limits |
| `backend/edms_api/ocr_tasks.py` | Modified | Uses tasks.py instead of inline registration |
| `backend/shared/cache.py` | **NEW** | Caching utilities with key generation and invalidation |
| `backend/shared/responses.py` | **NEW** | Standardized API response envelope helpers |
| `docker-compose.yml` | Modified | Added PgBouncer, updated DB connections, queue routing |
| `src/styles/globals.css` | Modified | Theme-aware component classes, Safari prefix |
| `src/src/components/layout/Header.tsx` | Modified | localStorage theme persistence |
| `src/src/components/ui/Shared.tsx` | Modified | Theme-aware CSS class migration |
| `.github/workflows/ci.yml` | **NEW** | CI/CD pipeline (backend, frontend, docker, staging) |
| `scripts/backup-db.sh` | **NEW** | PostgreSQL backup/verify/restore with retention |

---

## Next Steps (Priority Order)

1. **Frontend consolidation** — resolve `src/src/` duplication, wire API client (Phase 3)
2. **Backend tests** — cover race conditions, permissions, OCR lifecycle (Phase 4.3)
3. **Frontend tests** — add Vitest + smoke tests (Phase 4.4)
4. **Linting** — ESLint config + strict TypeScript (Phase 4.5)
5. **UI polish** — skeleton loading, sticky headers, tooltips (Phase 5.2)