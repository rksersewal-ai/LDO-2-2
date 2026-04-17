# Phase 3 — Security Audit (Incremental)

## Security fixes implemented

1. **File upload hardening (input validation / abuse resistance)**
   - Added centralized file validation in `DocumentIngestSerializer.validate_file_security()`.
   - Enforces:
     - extension presence,
     - allowlist-based extension restrictions (`EDMS_ALLOWED_UPLOAD_EXTENSIONS` or secure defaults),
     - maximum upload size (`EDMS_MAX_UPLOAD_SIZE_BYTES`, default 100MB).
   - Reused this validation for both ingest uploads and version uploads.

2. **Audit log access control (BOLA/IDOR reduction)**
   - Restricted `AuditLogViewSet` query scope so non-staff users can only see their own audit records.
   - Preserved staff/superuser ability to filter by arbitrary username.

3. **Health endpoint information disclosure reduction**
   - Replaced direct DB exception detail exposure in health responses with generic `ERROR` status.
   - Added server-side exception logging to keep diagnostics available internally.

4. **Background task enqueue robustness and observability**
   - Added warning logs when Celery enqueue fails and fallback runs inline.
   - Keeps API behavior stable while preserving root-cause evidence in logs.

## Tests added

- `DocumentIngestSerializerSecurityTests`
  - Reject oversized upload.
  - Reject disallowed extension.
- `AuditLogViewSetSecurityTests`
  - Non-admin user can only see own logs.
  - Admin user can filter logs by username.

## Remaining phase-3 items

- Token revocation policy coverage tests for all auth flows.
- Endpoint-by-endpoint RBAC matrix verification against product requirements.
- CSRF model validation for any cookie-auth mutation endpoints.
- Structured security event logging for all sensitive routes (download/export/admin settings).
