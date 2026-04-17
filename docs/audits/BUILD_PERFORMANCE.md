# Build Performance Guide

## Why builds were slow

The previous root build script always ran full workspace type-checking before building artifacts, which is ideal for CI correctness but slower for local iteration.

## New scripts

- `pnpm run build` → **fast path** (`build:fast`)
  - Builds only deployable artifacts:
    - `artifacts/api-server`
    - `artifacts/edms`
  - Uses maximum workspace concurrency.

- `pnpm run build:strict`
  - Runs full typechecks and then fast build.
  - Recommended for CI/release gates.

## Suggested workflow

- Local iteration: `pnpm run build`
- Pre-merge/CI: `pnpm run build:strict`

## Additional tips

1. Keep `pnpm-lock.yaml` stable to maximize store cache hits.
2. In CI, cache `~/.pnpm-store` between runs.
3. Avoid unnecessary clean builds unless debugging stale artifacts.
