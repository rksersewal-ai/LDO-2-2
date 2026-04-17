#!/usr/bin/env bash
# ─── seed.sh — Load sample/demo data into the database ───────────────────────
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/backend"

echo "🌱 Seeding demo data…"
if [ -d .venv ]; then
  source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
fi

python manage.py seed_demo_users
echo ""
echo "✅ Demo data seeded. Login credentials:"
echo "   admin / admin123"
echo "   a.kowalski / ldo2pass  (engineer)"
echo "   m.chen / ldo2pass      (supervisor)"
echo "   s.patel / ldo2pass     (reviewer)"
