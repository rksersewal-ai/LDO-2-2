# edms_api — Core Document & OCR API

## What It Does
Manages the document lifecycle (upload, metadata, versioning), OCR processing pipeline, and document search. This is the primary API surface for the EDMS frontend.

## Dependencies
- `shared` — Permissions, middleware, pagination, caching, error handling
- `documents` — Document indexing and file watching
- `integrations` — S3 storage, email notifications
- Celery + Redis — Async OCR job processing

## Public API
- `edms_api/views.py` — REST endpoints (`/api/v1/documents/`, `/api/v1/ocr/`)
- `edms_api/serializers.py` — Request/response schemas
- `edms_api/urls.py` — URL routing

## Running Tests
```bash
cd backend
pytest edms_api/tests.py -v
```

## Key Files
| File | Purpose |
|------|---------|
| `models.py` | Document, OcrJob, DocumentVersion models |
| `views.py` | DRF ViewSets for documents, OCR, search |
| `ocr_service.py` | OCR engine abstraction (Tesseract, PaddleOCR) |
| `ocr_tasks.py` | Synchronous OCR processing logic |
| `tasks.py` | Celery task wrapper with retry/time limits |
| `throttles.py` | Rate limiting for OCR endpoints |