# api-rate-limiting

[![ci](https://github.com/31mahadi/api-rate-limiting/actions/workflows/ci.yml/badge.svg)](https://github.com/31mahadi/api-rate-limiting/actions/workflows/ci.yml)

> **A distributed API rate limiter you can _watch_ work.**
> A Redis token-bucket limiter in **NestJS**, with a live **Next.js** dashboard that visualizes the
> bucket draining/refilling and requests flipping red (`429`) the instant traffic crosses the limit.

Part of my backend showcase series — backend-heavy, with a real frontend whose job is to make the
core concept _visible_.

| | |
|---|---|
| **Stack** | NestJS · TypeScript · Redis · Next.js · SSE · npm workspaces |
| **Live demo** | **https://api-rate-limiting-api.vercel.app** |
| **Live API** | https://api-rate-limiting-7g0s.onrender.com |
| **Run locally** | `docker compose up --build` — single Docker infra (web :5173 · api :3000 · redis) |
| **Simulate** | `npm run simulate` — k6 load test (runs in Docker) |

## Quick start

```bash
cp .env.example .env          # optional — compose has sane defaults
docker compose up --build
# open http://localhost:5173 and drag the traffic slider past the refill rate
```

Everything runs in Docker — you don't need Node, Redis, or k6 installed locally.

## What it proves

The limiter is a **token bucket**: a bucket holds up to `capacity` tokens and refills at
`refillPerSec`. Each request spends one; an empty bucket returns `429` with `Retry-After`. Push the
incoming rate above the refill rate and the bucket drains — the dashboard shows it live.

### Verified behavior

```
# Burst against a fresh capacity-10 bucket
200s = 10   429s = 10        # exactly the burst ceiling, then throttled

# k6: 25 req/s for 20s vs a 5/s refill (capacity 10)
served    (200): 109  (~5.5/s — tracks the refill rate)
throttled (429): 392  (78% of requests)
=> limiter ENGAGED ✅
```

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` (on 429), all
CORS-exposed so the browser can read them.

Live at **[api-rate-limiting-api.vercel.app](https://api-rate-limiting-api.vercel.app)** — drag the
slider past 5/s and watch it throttle. _(The API is on Render's free tier, which sleeps after ~15 min
idle, so the first request wakes it in a few seconds.)_ _TODO: add a short dashboard GIF._

## Deploy

Free, per-app PaaS with one source of truth for env (Doppler → Vercel + Render, shared Upstash
Redis). Full runbook in [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## How it works

See [`docs/architecture.md`](./docs/architecture.md). Key decisions:
- [ADR 0001](./docs/adr/0001-token-bucket-vs-sliding-window.md) — token bucket over sliding/fixed window.
- [ADR 0002](./docs/adr/0002-atomicity-via-lua-vs-multi-exec.md) — atomicity via a Redis Lua script.

The algorithm lives as a **pure domain function** (unit-tested with a fake clock) behind a
`RateLimitStore` port, with two adapters: an atomic **Redis Lua** store for production and an
in-memory store for tests. The guard is a thin delivery-layer wrapper — it knows nothing about Redis.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/work` | Rate-limited; 200 (token spent) or 429 |
| `GET` | `/api/events` | SSE stream of every limiter decision (drives the dashboard) |
| `GET` | `/api/config` | Active `{ capacity, refillPerSec }` |
| `GET` | `/health` | Readiness (checks Redis) |

## Layout

```
apps/api          NestJS — token-bucket limiter, guard, SSE event stream
apps/web          Next.js — live visualization dashboard
packages/shared   shared TypeScript types (no FE/BE drift)
simulate          k6 load scenario
docs              architecture + ADRs
```

## Develop without Docker

```bash
npm install
npm run build:shared
# terminal 1 — needs a local Redis on :6379
npm run start:dev -w @repo/api
# terminal 2
npm run dev -w @repo/web
npm test            # api unit tests
npm run typecheck   # all workspaces
```

## Config

| Var | Default | Meaning |
|---|---|---|
| `RATE_LIMIT_CAPACITY` | `10` | Bucket size (burst ceiling) |
| `RATE_LIMIT_REFILL_PER_SEC` | `5` | Sustained rate |
| `REDIS_URL` | `redis://redis:6379` | Redis connection |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origin(s), comma-separated |
| `PORT` | `3000` | API port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | API base URL baked into the web build |
