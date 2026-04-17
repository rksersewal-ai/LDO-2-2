# LDO-2

LDO-2 is a monorepo for the EDMS web application and its supporting services.

## Active stack

- `artifacts/edms` — production React/Vite frontend
- `backend` — Django REST backend
- `artifacts/api-server` — lightweight Node mock API for local UI development
- `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` — shared API contract/codegen packages
- `artifacts/mockup-sandbox` — optional UI sandbox for isolated design work

## Repository layout

```text
artifacts/
  api-server/        mock API service
  edms/              production frontend
  mockup-sandbox/    UI-only sandbox
backend/             Django backend
docs/                ADRs, audits, mockups, stack notes
lib/                 shared API libraries
scripts/             utility scripts
src/                 legacy frontend sandbox retained for reference
```

## Getting started

1. Install dependencies with `pnpm install`.
2. Start the production frontend with `pnpm run dev:edms`.
3. Start the mock API with `pnpm run dev:api-server`.
4. Run the Django backend separately with `python backend/manage.py runserver` after setting up the Python environment and backend dependencies.

## Useful commands

- `pnpm run build:fast` — build the frontend and mock API
- `pnpm run build:strict` — typecheck then build
- `pnpm run typecheck` — typecheck workspace packages
- `pnpm run dev:mockup-sandbox` — run the isolated UI sandbox

## Notes

- `docs/audits/` contains historical audit and migration notes. Treat them as reference material, not the current source of truth.
- The production frontend is `artifacts/edms`. The root `src/` tree is legacy and is not the primary deployment target.
