# ADR 0001: Django REST Framework for Backend API

**Date:** 2024-Q4  
**Status:** Accepted

## Context
The EDMS backend needs to serve a REST API with role-based access control, OCR pipeline management, and complex document lifecycle workflows. Options considered:
1. Node.js/Express with TypeORM
2. Django REST Framework with PostgreSQL
3. FastAPI with SQLAlchemy

## Decision
Use Django REST Framework (DRF) with PostgreSQL.

## Consequences
- **Positive:** DRF's built-in auth, permissions, serializers, and admin interface significantly reduce boilerplate. Python ecosystem has strong OCR libraries (Tesseract, PaddleOCR). Django ORM handles complex queries well.
- **Negative:** Python's async story is weaker than Node.js. Django's monolithic nature requires discipline to keep modules decoupled. No real-time WebSocket support without additional layers (Django Channels).
- **Mitigation:** Use Celery for async tasks. Use Django Channels only if real-time features are needed. Enforce module boundaries via Django apps with explicit public APIs.

## References
- `backend/edms/settings.py`
- `backend/shared/permissions.py`