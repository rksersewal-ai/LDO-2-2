# Phase 2 — Dependency & Environment Audit

## Skill usage note
No directly matching `SKILL.md` in the available list covers backend dependency/CVE remediation workflows for this Django+pnpm monorepo. I used the repository-native tooling directly (`pnpm`, `pip`, `rg`) and documented gaps.

## 1) Dependency manifest inventory

### Python
- `backend/requirements.txt` (all pinned)
- `backend/requirements-ocr.txt` (all pinned)
- `backend/requirements-loadtest.txt` (pinned)

### Node / TypeScript
- Root `package.json` + `pnpm-lock.yaml`
- Workspace package manifests under `artifacts/*`, `lib/*`, `scripts/`

## 2) Automated dependency checks run

### Completed
- `pnpm install --frozen-lockfile` ✅ lockfile consistency check passed.
- `python -m pip check` ✅ no conflicting installed Python requirements.

### Blocked by environment restrictions
- `pnpm audit --prod` ⚠️ registry endpoint returned 403.
- `pnpm outdated` ⚠️ registry fetch returned 403.
- `pip-audit` install/run ⚠️ package index/proxy returned 403.

## 3) Manual risk findings

1. **Environment secret hygiene risk**: root `.gitignore` previously did not ignore generic `.env` variants, increasing chance of accidentally committing secrets.
   - Mitigation applied: added ignore entries for root and nested `.env*` local files while preserving committed templates/examples.

2. **Password policy weakness**: backend had `AUTH_PASSWORD_VALIDATORS = []`, allowing weak passwords.
   - Mitigation applied: enabled Django’s standard validator set (similarity, min length, common password, numeric-only checks).

3. **Potential supply-chain review item**: root `package.json` uses a direct tarball override for `xlsx` from a CDN URL.
   - Recommendation: verify integrity process and vendor policy in CI (checksum pinning + source allowlist), then migrate to registry source if possible.

## 4) Environment configuration audit status

- `.env.example` includes core DB, secret, CORS, Redis, and runtime controls.
- Runtime CORS/CSRF origins are environment-driven.
- Django secret key and PostgreSQL password are environment-driven.
- Additional hardening flags now included in env template (`DJANGO_*_SECURE`, upload limits).

## 5) Pending actions (must run in network-enabled CI)

1. Run `pnpm audit --prod --json` and open/fix all High/Critical advisories.
2. Run `pnpm outdated --recursive` and schedule safe semver upgrades package-by-package.
3. Run `pip-audit -r backend/requirements.txt -r backend/requirements-ocr.txt -f json` and patch CVEs.
4. Enforce dependency checks in CI gate before merge.
