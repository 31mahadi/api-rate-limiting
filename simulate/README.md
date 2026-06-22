# Simulation

Proves the limiter **engages** under traffic, not just that the app boots.

```bash
# whole stack up first
docker compose up --build -d

# run the load test (k6 runs in Docker too — nothing to install)
npm run simulate
# equivalent to: docker compose run --rm k6 run /scripts/load.js
```

## What it does
Drives **25 req/s for 20s** at a bucket configured for **capacity 10, refill 5/s**
(`over_limit` scenario, constant arrival rate).

## What to look for
- An initial burst of `200`s (the bucket starts full at 10),
- then a steady **~5 `200`s per second** (the refill rate),
- with the remaining **~20/s returning `429`** plus a `Retry-After` header.

The run **fails its thresholds** if throttling never engages — i.e. the test asserts the limit works.
Open the dashboard at http://localhost:5173 during the run to watch it live.
