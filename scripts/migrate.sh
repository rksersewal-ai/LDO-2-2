#!/usr/bin/env bash
# ─── migrate.sh — Run database migrations ─────────────────────────────────────
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/backend"

echo "🗄  Running Django migrations…"
if [ -d .venv ]; then
  source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
fi
python manage.py migrate --no-input "$@"
echo "✅ Migrations complete"
