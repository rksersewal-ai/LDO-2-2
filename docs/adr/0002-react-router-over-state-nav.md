# ADR 0002: React Router for Frontend Navigation

**Date:** 2025-Q1  
**Status:** Accepted

## Context
The frontend initially used a state-based navigation pattern (`useState("dashboard")` with a switch statement). As pages grew from 5 to 20+, this became unmaintainable. Options:
1. Continue with state-based navigation
2. React Router (file-based or config-based)
3. Wouter (lightweight alternative)

## Decision
Use React Router v7 with a config-based route definition (`src/src/routes.ts`).

## Consequences
- **Positive:** URL-driven navigation enables deep linking, browser back/forward, and bookmarkable pages. Route-based code splitting is possible. Nested layouts (AppLayout) work naturally.
- **Negative:** Requires discipline to keep route definitions centralized. Dynamic imports add complexity.
- **Mitigation:** Single `routes.ts` file as source of truth. Lazy-load heavy pages (BOMExplorer, PLDetail) in future.

## References
- `src/src/routes.ts`
- `src/src/components/layout/AppLayout.tsx`