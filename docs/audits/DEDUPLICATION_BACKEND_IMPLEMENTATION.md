# Deduplication Console Backend Implementation Notes

This document defines the backend work needed to support the new single-screen **Document Deduplication Console** in the EDMS.

## Scope

The frontend now assumes a PostgreSQL-backed dedup workflow with:

- metadata-only duplicate scans
- metadata + sparse fingerprint scans
- optional full-file hash confirmation for high-value classes
- background hash backfill
- candidate duplicate groups
- group review and decision actions

## Recommended Data Model

Add or normalize the following on the document record:

```sql
size_bytes BIGINT NOT NULL
fingerprint_3x64k CHAR(64) NULL
full_hash_sha256 CHAR(64) NULL
hash_algo TEXT NOT NULL DEFAULT 'blake3'
hash_version SMALLINT NOT NULL DEFAULT 1
source_system TEXT NULL
is_archived BOOLEAN NOT NULL DEFAULT FALSE
```

Recommended indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_documents_dedup_fingerprint
  ON documents (size_bytes, fingerprint_3x64k);

CREATE INDEX IF NOT EXISTS idx_documents_full_hash
  ON documents (full_hash_sha256);

CREATE INDEX IF NOT EXISTS idx_documents_source_system
  ON documents (source_system);

CREATE INDEX IF NOT EXISTS idx_documents_upload_date
  ON documents (created_at);
```

## Content Index

To avoid repeated full-hash work across repeated uploads, add a reusable content index:

```sql
CREATE TABLE content_index (
  content_id UUID PRIMARY KEY,
  size_bytes BIGINT NOT NULL,
  fingerprint_3x64k CHAR(64) NOT NULL,
  full_hash_sha256 CHAR(64),
  hash_algo TEXT NOT NULL,
  hash_version SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_index_fingerprint
  ON content_index (size_bytes, fingerprint_3x64k);
```

Document rows should reference the reusable content entry where possible instead of recomputing expensive hashes for identical payloads.

## Dedup Matching Pipeline

Use a staged pipeline to minimize I/O:

1. Stage 0: metadata and size prefilter
   - same `size_bytes`
   - same normalized document number / title / revision / class
2. Stage 1: sparse fingerprint match
   - compare stored `fingerprint_3x64k`
3. Stage 2: full-hash confirmation
   - only for high-value classes or ambiguous groups
   - compute once, store once, reuse afterwards

## Background Jobs

Add asynchronous jobs for:

- `hash_backfill`
  - scans documents where `fingerprint_3x64k IS NULL`
  - processes in batches
- `dedup_run`
  - creates/refreshes candidate duplicate groups
- `full_hash_confirm`
  - computes full hashes only for promoted or high-risk groups
- `dedup_report_export`
  - generates CSV/XLSX reports without blocking the request thread

Recommended worker behavior:

- batch size: 500 to 2000 documents
- bounded concurrency
- off-peak scheduling by default
- status persisted in a job table

## Group Storage

Do not recompute the full candidate set on every screen interaction. Persist dedup runs and their groups:

```sql
dedup_runs
- id
- mode
- scope_repository
- scope_collection
- scope_plant
- include_archived
- confirm_full_hash
- started_at
- completed_at
- status
- created_by

dedup_groups
- id
- run_id
- group_code
- status
- potential_savings_bytes
- suggested_master_document_id
- risk_summary_json

dedup_group_documents
- id
- group_id
- document_id
- metadata_key
- fingerprint_state
- refs_erp
- refs_work
- refs_config
- refs_approvals

dedup_decisions
- id
- group_id
- decision_type
- master_document_id
- note
- created_by
- created_at
```

## Required API Endpoints

All endpoints should live under `/api/v1/admin/deduplication`.

### Query endpoints

- `GET /groups`
  - query params:
    - `mode`
    - `repository`
    - `collection`
    - `plant`
    - `include_archived`
    - `confirm_full_hash`
    - `document_classes[]`
    - `source_system`
    - `owner`
    - `upload_from`
    - `upload_to`
    - `min_size_bytes`
    - `search`
    - `page`
    - `page_size`
- `GET /groups/{group_id}`
- `GET /jobs`

### Action endpoints

- `POST /run`
  - queues a dedup run using current mode/scope
- `POST /schedule`
  - stores recurring job schedule
- `POST /scan-missing-hashes`
  - queues hash backfill only for missing sparse hashes
- `POST /groups/{group_id}/apply-decision`
  - body:
    - `decision_type`
    - `master_document_id`
    - `note`
- `POST /groups/{group_id}/mark-non-duplicate`
- `POST /groups/bulk-ignore`
- `GET /export`

## Response Shape

Keep the response aligned with the current frontend list contract:

```json
{
  "results": [],
  "total": 0,
  "page": 1,
  "pageSize": 25,
  "hasMore": false
}
```

Each group payload should include:

- group id
- mode used
- derived status
- potential savings
- suggested master
- risk list
- documents in group
- per-document fingerprint state
- per-document link counts
- decision log

## Permission Rules

The console must respect the existing EDMS permission model:

- only admin / records-management roles can access action endpoints
- group membership must include only documents the caller is allowed to see
- all decision actions must be audit logged with actor, timestamp, previous state, and resulting state

## Request-Time Rules

- mode changes requery only; no server-side session state
- scan/hash/export endpoints return job handles immediately
- heavy hashing must not block UI requests
- all list/filter endpoints remain stateless and driven by query params

## Frontend Assumptions Already Implemented

The current UI already expects:

- a single-screen console under `Admin -> Deduplication`
- sticky grouped table rows
- a collapsible right review panel
- outside-click / Escape dismissible overlays
- non-blocking background job triggers
- deep links back into document, approval, BOM, and report areas

When the backend is ready, the mock/stateful page can be converted route-by-route without changing the screen structure.
