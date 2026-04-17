# shared — Cross-Cutting Concerns

## What It Does
Provides reusable infrastructure for all Django apps: authentication, permissions, middleware, pagination, caching, error handling, and standardized API responses.

## Dependencies
- Django REST Framework
- Redis (for caching, optional)

## Public API
- `permissions.py` — `TenantPlantPermission`, `scope_queryset()`
- `middleware.py` — `TenantPlantMiddleware`, `CorrelationIdMiddleware`
- `pagination.py` — `StandardResultsSetPagination`
- `cache.py` — `cache_key()`, `cached_view()`, `invalidate_prefix()`
- `responses.py` — `success_response()`, `success_paginated()`, `accepted_response()`
- `exceptions.py` — Standardized error envelope
- `request_context.py` — `get_correlation_id()`

## Running Tests
```bash
cd backend
pytest shared/tests.py -v