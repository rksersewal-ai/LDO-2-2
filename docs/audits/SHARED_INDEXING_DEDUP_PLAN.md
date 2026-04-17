# Shared Folder Indexing, Search, and Dedup Plan

## Current Position

Before this change, the application already had:

- local metadata extraction and regex pattern indexing in `backend/documents/indexing.py`
- local full-text search through PostgreSQL or SQLite fallback in `backend/shared/services.py`
- search persistence in `Document.search_text`, `Document.search_metadata`, and `Document.search_indexed_at`

Before this change, the application did **not** have:

- shared/network folder crawling and indexing
- durable sparse fingerprints for deduplication
- a content index for hash reuse
- duplicate state stored on document records
- search filters to include, exclude, or isolate duplicates

## Implemented Backend Plan

### 1. Persistent content indexing

Added durable hash metadata to document records:

- `fingerprint_3x64k`
- `file_hash` reused as the full SHA-256 when available
- `hash_algo`
- `hash_version`
- `hash_indexed_at`

Added `DocumentContentIndex` so repeated uploads or indexed network files can reuse existing hash results instead of recomputing the expensive full hash every time.

### 2. Shared folder indexing

Added `index_shared_documents` management command to crawl a shared/network folder, upsert document records, capture file timestamps, compute sparse fingerprints, and route the result through the same search/dedup orchestrator used by normal documents.

### 3. Duplicate marking without deletion

Added duplicate state on `Document`:

- `duplicate_status` = `UNIQUE | MASTER | DUPLICATE`
- `duplicate_group_key`
- `duplicate_of`
- `duplicate_marked_at`

Rule implemented:

- documents with the same fingerprint/hash are grouped
- the newest file becomes `MASTER`
- older files are marked `DUPLICATE`
- no hard delete is performed

### 4. Search filter support

Added duplicate filters to search and document-list queries:

- `duplicates=include`
- `duplicates=exclude`
- `duplicates=only`

This allows UI and reporting flows to show all files, hide duplicates, or review duplicates only.

## Operational Flow

### Upload / normal document save

1. Save document record
2. Resolve file path
3. Compute sparse fingerprint once
4. Reuse or populate content index
5. Compute full hash only when required
6. Refresh full-text metadata
7. Re-evaluate duplicate group

### Shared folder indexing

1. Crawl a supplied root path
2. Upsert external-path-backed document records
3. Compute fingerprints and search metadata
4. Mark older duplicates
5. Expose indexed documents through normal search APIs

## API-Level Result

The search endpoint now supports duplicate-aware queries:

- `GET /api/v1/search/?q=...&scope=DOCUMENTS&duplicates=include`
- `GET /api/v1/search/?q=...&scope=DOCUMENTS&duplicates=exclude`
- `GET /api/v1/search/?q=...&scope=DOCUMENTS&duplicates=only`

The normal documents list also supports the same duplicate filter parameter.

## Next UI Work

The backend is now ready for the frontend to add:

- a duplicate filter control in Search Explorer
- dedup status badges in document search results
- dedup review tables inside the Deduplication Console
- shared-folder index job launch controls under Admin
