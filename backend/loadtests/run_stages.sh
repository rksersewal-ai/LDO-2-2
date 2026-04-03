#!/usr/bin/env bash
set -euo pipefail

HOST="${LOCUST_HOST:-http://127.0.0.1:8420}"
DURATION="${LOCUST_STAGE_DURATION:-5m}"
RAMP_RATE_DIVISOR="${LOCUST_RAMP_RATE_DIVISOR:-5}"
OUT_DIR="${LOCUST_OUT_DIR:-backend/loadtests/results}"
STAGES="${LOCUST_STAGES:-1000 10000 50000 100000}"
mkdir -p "$OUT_DIR"

if ! command -v locust >/dev/null 2>&1; then
  echo "locust not found. Install with: pip install -r backend/requirements-loadtest.txt"
  exit 1
fi

run_stage () {
  local users="$1"
  local spawn_rate=$(( users / RAMP_RATE_DIVISOR ))
  if [[ "$spawn_rate" -lt 1 ]]; then
    spawn_rate=1
  fi

  echo "Running stage users=${users} spawn_rate=${spawn_rate} duration=${DURATION}"
  locust \
    --headless \
    --host "$HOST" \
    -u "$users" \
    -r "$spawn_rate" \
    --run-time "$DURATION" \
    --only-summary \
    --html "${OUT_DIR}/stage_${users}.html" \
    --csv "${OUT_DIR}/stage_${users}" \
    -f backend/loadtests/locustfile.py
}

for users in ${STAGES}; do
  run_stage "$users"
done
