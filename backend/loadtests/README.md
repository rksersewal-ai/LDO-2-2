# Load Testing (Phase 7)

## Install

```bash
pip install -r backend/requirements-loadtest.txt
```

## Run staged load

```bash
LOCUST_HOST=http://127.0.0.1:8420 \
LOCUST_STAGE_DURATION=5m \
backend/loadtests/run_stages.sh
```

### Optional controls

- `LOCUST_STAGES="1000 10000 50000 100000"`
- `LOCUST_RAMP_RATE_DIVISOR=5`
- `LOCUST_OUT_DIR=backend/loadtests/results`
- `LOCUST_API_PREFIX=/api/v1`
- `LOCUST_USERNAME=<user>` and `LOCUST_PASSWORD=<pass>` for authenticated runs.

## Analyze results and validate targets

```bash
backend/loadtests/analyze_results.py > backend/loadtests/results/summary.json
```

The analyzer reports per-stage:
- overall error rate,
- max p95 for read-like endpoints,
- max p95 for write-like endpoints,
- slowest 10 endpoints by p99 latency,
- boolean checks for target thresholds.

## Notes

- For 100k-user runs, execute against dedicated perf infrastructure.
- Track DB pool metrics and host memory/CPU in parallel with Locust output.
