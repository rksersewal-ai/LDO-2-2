# ADR 0003: PgBouncer for Database Connection Pooling

**Date:** 2026-Q1  
**Status:** Accepted

## Context
With Celery workers, the Django API server, and beat scheduler all opening PostgreSQL connections, the database was hitting connection limits under load. Each Django process maintains idle connections.

## Decision
Add PgBouncer as a transaction-mode connection pooler between all services and PostgreSQL.

## Consequences
- **Positive:** Drastically reduces PostgreSQL connection count (200 client → 25 server). Transaction mode is safe for Django. No application code changes needed.
- **Negative:** One more service to monitor. Session-level features (SET, LISTEN/NOTIFY, advisory locks) don't work in transaction mode.
- **Mitigation:** Django doesn't use LISTEN/NOTIFY. Advisory locks replaced by `select_for_update()`.

## References
- `docker-compose.yml` (pgbouncer service)
- `backend/work/services.py` (select_for_update usage)