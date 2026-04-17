#!/usr/bin/env bash
# ─── setup.sh — Initial local development setup ───────────────────────────────
# Run this once after cloning the repo.
#   chmod +x scripts/setup.sh && ./scripts/setup.sh
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " LDO-2 EDMS — Local Development Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$REPO_ROOT"

# ── 1. Copy environment file ──────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example…"
  cp .env.example .env
  echo "⚠️  IMPORTANT: Edit .env and set DJANGO_SECRET_KEY and POSTGRES_PASSWORD"
fi

# ── 2. Frontend deps ──────────────────────────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies…"
if command -v pnpm &>/dev/null; then
  pnpm install
elif command -v npm &>/dev/null; then
  npm install -g pnpm && pnpm install
else
  echo "ERROR: Node.js / pnpm not found. Install Node 20+ from https://nodejs.org"
  exit 1
fi

# ── 3. Backend virtual environment ────────────────────────────────────────────
echo ""
echo "🐍 Setting up Python virtual environment…"
cd "$REPO_ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null

pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✅ Python deps installed"

# ── 4. Database migrations ─────────────────────────────────────────────────
echo ""
echo "🗄  Running database migrations…"
python manage.py migrate --no-input

# ── 5. Seed demo data ─────────────────────────────────────────────────────
echo ""
echo "🌱 Seeding demo users and data…"
python manage.py seed_demo_users || echo "  (seed_demo_users failed — may already exist)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Setup complete!"
echo ""
echo " Next steps:"
echo "   Run backend:  cd backend && source .venv/bin/activate && python manage.py runserver 8420"
echo "   Run frontend: cd artifacts/edms && pnpm dev"
echo ""
echo " Or use Docker: docker-compose --profile dev up -d"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
