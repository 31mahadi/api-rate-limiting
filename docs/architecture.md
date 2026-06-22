# Architecture

## Overview
A NestJS API enforces a distributed token-bucket rate limit backed by Redis. Every limiter decision
is published on an in-process event bus and streamed to a Next.js dashboard over SSE, so the bucket
and the 200/429 outcomes are visible in real time.

```
┌──────────────────────────────┐         ┌───────────────────────────────┐
│  Web (Next.js, :5173)        │  SSE    │  API (NestJS, :3000)          │
│  - TrafficControl (slider)   │ ◀────── │  GET  /api/events  (SSE)      │
│  - TokenBucketGauge          │         │  GET  /api/work    (limited)  │
│  - RequestStream             │ ──────▶ │  GET  /api/config             │
│  - ThroughputChart           │  fetch  │  GET  /health                 │
└──────────────────────────────┘         │         │                     │
        ▲ traffic generator               │         ▼                     │
        │ (x-demo-session header)          │  RateLimiterGuard            │
        └──────────────────────────────────┤    → RateLimiterService      │
                                            │        → RateLimitStore (port)│
                                            │           ├ RedisStore (Lua) ─┼──▶ Redis
                                            │           └ MemoryStore (test)│
                                            │        → RateLimitEventBus ───┼─▶ SSE
                                            └───────────────────────────────┘
```

## Layers (hexagonal seam)
- **Domain** (`rate-limit/domain`) — `token-bucket.ts` is a pure function (now, state, params) → result;
  zero framework/IO. `rate-limit-store.port.ts` is the persistence interface.
- **Infra** (`rate-limit/infra`) — `RedisStore` (atomic Lua, ADR 0002) and `MemoryStore` implement the port.
- **Delivery** — `RateLimiterGuard` resolves config + key, sets `X-RateLimit-*` / `Retry-After`,
  returns 200 or throws 429; `WorkController`/`EventsController` are thin.

The domain has no imports from Nest, Redis, or Express — so it unit-tests with a fake clock and no infra.

## Request flow
1. Browser fires `GET /api/work` with an `x-demo-session` header (one bucket per visitor).
2. Guard resolves config (route `@RateLimit()` override → env defaults) and the bucket key.
3. `RateLimiterService` calls the store; Redis runs the Lua script atomically and returns `{allowed, tokens}`.
4. The decision is published to the event bus and returned; the guard sets headers / 429.
5. The dashboard receives the decision over SSE and animates the gauge, stream, and chart.

## Config (12-factor, validated at boot)
`PORT`, `REDIS_URL`, `CORS_ORIGIN`, `RATE_LIMIT_CAPACITY`, `RATE_LIMIT_REFILL_PER_SEC` — parsed and
validated by Zod (`config/env.ts`); a bad value fails fast with a readable error.

## Why SSE (not WebSocket)
The stream is one-way (server → browser), so SSE is the simpler fit: native `EventSource`,
auto-reconnect, plain HTTP — no socket lifecycle to manage on a free tier.
