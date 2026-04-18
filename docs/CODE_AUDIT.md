# LDO-2 Code Audit

_Date: 2026-04-18_

This document captures findings from a static review of the LDO-2 codebase. Issues are grouped by priority with file paths and line references so each one can be triaged independently.

This PR fixes the items marked **[Fixed in this PR]**. The remaining items are tracked here for follow-up work.

---

## High Priority

### 1. Unsafe `any` types in service / hook layer
TypeScript's safety is bypassed in several core services. When the backend response shape drifts, these will fail silently at runtime instead of being caught at build time.

- `artifacts/edms/src/services/DashboardDataService.ts` — KPI snapshot fields typed as `readonly any[]`; `(stats as any).documents` cast on the API response. **[Fixed in this PR]** for the API cast; field-level types still need proper interfaces from `lib/types.ts`.
- `artifacts/edms/src/services/SearchService.ts` (lines 42, 74, 96, 107, 118) — `doc: any`, `item: any`, `record: any`, `caseRecord: any` mappers.
- `artifacts/edms/src/hooks/useApi.ts` (lines 26, 131, 167, 168) — generic mutation payloads typed as `any`.
- `artifacts/edms/src/services/PLService.ts` (lines 99, 234) — `mapApiPlItem(item: any)` and `catch (err: any)`.
- `artifacts/edms/src/services/DocumentChangeAlertService.ts` (line 31) — `mapApiReview(review: any)`.
- `artifacts/edms/src/lib/types.ts` (lines 321–324) — central `SearchResponse`-style interface uses `any[]` for `documents`, `work_records`, `pl_items`, `cases`. This is the root cause for several downstream `any` casts.

### 2. Unnecessary `as any` casts
These can be removed without changing behaviour because the underlying types are already correct.

- `artifacts/edms/src/components/layout/AppLayout.tsx` (lines 31, 42) — `(prefs as any)` and `(PreferencesService.get() as any)`. `PreferencesService.get()` already returns `UserPreferences`. **[Fixed in this PR]**
- `artifacts/edms/src/components/ui/CommandPalette.tsx` (line 228) and `artifacts/edms/src/components/ui/RightClickPalette.tsx` (line 268) — `cmd.roles as any` / `action.roles as any` should be typed against the role union from `lib/auth.tsx`.
- `artifacts/edms/src/pages/PLDetail.tsx` (line ~2532) — `setActiveTab(tab.id as any)`; `activeTab` should use the literal-union of tab ids.

### 3. Hardcoded mock credentials
Mock credentials live alongside production code. They are intended for the dev mock API path, but they should at least be moved out of paths shipped in production builds.

- `artifacts/edms/vite.config.ts` (lines 16–62) — `MOCK_USERS` table with passwords. The plugin only mounts when `VITE_ENABLE_DEV_MOCK_API=true`, but the credentials are checked into the repo. Move to a `.env`-driven seed or to a non-shipped fixture file.
- `artifacts/api-server/src/routes/auth.ts` — same credentials repeated. Single source of truth would be safer.
- `src/src/lib/auth.tsx` — duplicate auth implementation that also embeds the mock passwords (see "Duplicate frontend tree" below).
- `backend/edms_api/tests.py` — `pass12345` hardcoded in tests. Acceptable for tests but should be a constant.

---

## Medium Priority

### 4. Duplicate frontend tree
There are two nearly-identical React frontends:
- `artifacts/edms/src/` — the active production frontend (run by the `Start application` workflow).
- `src/` — a "legacy sandbox" that still contains a parallel `src/src/lib/auth.tsx` with the same mock users.

Either delete `src/` or convert it to a clearly-marked archive directory. Right now grep results return duplicates, mock data drifts, and contributors edit the wrong copy.

### 5. Generic catch blocks swallow errors
- `artifacts/edms/src/services/PLService.ts:234` — `catch (err: any) {}` with no logging.
- `artifacts/edms/src/pages/OCRMonitor.tsx:151` — `.catch((error: any) => { ... })` discards stack info.
- `artifacts/edms/src/lib/auth.tsx:120` — generic auth catch.
- `artifacts/edms/src/services/DashboardDataService.ts` — `catch {}` silently falls back to mock data on any backend error, which can mask real outages in production.

Pattern fix: type as `unknown`, narrow with `instanceof Error`, and surface to the toast/log layer.

### 6. Backend inconsistencies
- `backend/edms_api/models.py` — primary keys are `CharField(default=uuid.uuid4)` instead of native `UUIDField`. Less efficient on PostgreSQL and loses type validation.
- `backend/services/batch_processor.py:46` — uses `print()` instead of the `logging` module that the rest of `backend/documents/services.py` uses.

### 7. Silent fallbacks
`DashboardDataService.getSnapshot()` falls back to mock data on _any_ thrown error from the real API. This is appropriate for development but dangerous in production — a real outage will be invisible to operators. Gate the fallback on `import.meta.env.DEV` or surface a banner.

---

## Low Priority

### 8. Remaining `console.log`
- `artifacts/edms/src/hooks/useOverloadProtection.ts` — debug logs that should go through a real logger.

### 9. Documentation noise
`artifacts/edms/` ships several large markdown files at the root (`API_RESPONSE_STANDARDIZATION.md`, `RETRY_LOGIC_GUIDE.md`, `CRASH_PROTECTION_IMPLEMENTATION.md`, `OVERLOAD_PROTECTION_AND_SAFETY_GUIDE.md`, `TYPOGRAPHY_AND_SPACING_GUIDE.md`). Consider consolidating under a single `docs/` folder.

---

## Verification done in this PR

- `pnpm run typecheck:edms` — passes.
- `pnpm run lint:frontend` (Prettier) — passes.
- App still boots under `VITE_ENABLE_DEV_MOCK_API=true pnpm --filter @workspace/edms run dev` and the sidebar collapse preference still persists across reloads.

## Suggested follow-up tasks

1. Replace `any[]` in `lib/types.ts` with concrete entity interfaces, then propagate through `SearchService`, `DashboardDataService`, `PLService`.
2. Delete or archive the duplicate `src/` tree.
3. Move dev-only mock credentials behind environment configuration.
4. Standardise error handling: a small `safeAsync` / `logError` helper would let us remove every `catch (e: any)`.
5. Migrate backend ID columns to `UUIDField` and add a migration.
