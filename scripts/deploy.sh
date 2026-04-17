#!/usr/bin/env bash
# ─── deploy.sh — Production deployment ────────────────────────────────────────
# Usage: ./scripts/deploy.sh [--skip-build] [--no-migrate]
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SKIP_BUILD=false
NO_MIGRATE=false
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --no-migrate) NO_MIGRATE=true ;;
  esac
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " LDO-2 EDMS — Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate .env
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Run scripts/setup.sh first."
  exit 1
fi

if ! grep -q "DJANGO_SECRET_KEY" .env || grep -q "CHANGE_ME" .env; then
  echo "ERROR: .env has placeholder values. Set DJANGO_SECRET_KEY and POSTGRES_PASSWORD."
  exit 1
fi

# Build Docker images
if [ "$SKIP_BUILD" = false ]; then
  echo "🐳 Building Docker images…"
  docker-compose build backend frontend
fi

# Run backend migrations
if [ "$NO_MIGRATE" = false ]; then
  echo "🗄  Running migrations…"
  docker-compose run --rm backend python manage.py migrate --no-input
  docker-compose run --rm backend python manage.py collectstatic --no-input
fi

# Start production services
echo "🚀 Starting production services…"
docker-compose --profile prod up -d db redis backend celery_worker celery_beat frontend

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Deployment complete!"
echo "   Frontend: http://localhost:80"
echo "   Backend API: http://localhost:8420/api/v1/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
