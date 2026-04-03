import os


def validate_startup_config(*, debug: bool, db_engine: str, env: dict[str, str] | None = None) -> list[str]:
    env = env or os.environ
    issues: list[str] = []

    secret_key = (env.get('DJANGO_SECRET_KEY') or '').strip()
    if not secret_key:
        issues.append('DJANGO_SECRET_KEY is required.')
    elif not debug and 'your-secret-key' in secret_key.lower():
        issues.append('DJANGO_SECRET_KEY must not use placeholder/default values in non-debug mode.')

    if not (env.get('DJANGO_ALLOWED_HOSTS') or '').strip():
        issues.append('DJANGO_ALLOWED_HOSTS must be configured.')

    if db_engine == 'postgresql' and not (env.get('POSTGRES_PASSWORD') or '').strip():
        issues.append('POSTGRES_PASSWORD is required when EDMS_DB_ENGINE=postgresql.')

    return issues


def enforce_startup_config(*, debug: bool, db_engine: str, env: dict[str, str] | None = None) -> None:
    issues = validate_startup_config(debug=debug, db_engine=db_engine, env=env)
    if issues:
        raise RuntimeError('Startup configuration validation failed: ' + '; '.join(issues))
