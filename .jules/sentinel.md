## 2026-04-02 - Removed Hardcoded Secrets from Settings
**Vulnerability:** Hardcoded fallback passwords (`secure_password_here`) and secret keys (`django-insecure-...`) were present in `backend/edms/settings.py` and `backend/edms/settings_api.py`.
**Learning:** Defaulting to a known password could lead to unauthorized database access if a PostgreSQL instance is provisioned with this default configuration. Similarly, falling back to a known Django SECRET_KEY allows attackers to forge sessions and cryptographic signatures.
**Prevention:** Always read credentials directly from environment variables (e.g., `os.environ['POSTGRES_PASSWORD']` and `os.environ['DJANGO_SECRET_KEY']`) without fallback values, causing the application to fail fast with a `KeyError` if secrets are omitted.
