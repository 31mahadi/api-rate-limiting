# Implementation Plan — `api-rate-limiting`

> **A distributed API rate limiter you can _watch_ work.**
> Backend: a Redis token-bucket limiter in NestJS. Frontend: a live dashboard that visualizes
> tokens draining/refilling and requests turning red (429) the instant traffic crosses the limit.

This is the first repo in the backend showcase series — **backend-heavy with a real, polished
frontend slice**. The frontend exists for one reason: to make the core concept *visible*.

| | |
|---|---|
| **What it proves** | I understand rate-limiting algorithms, distributed atomicity, and can demonstrate them visually |
| **Stack** | NestJS · TypeScript · Redis (Upstash) · Next.js (App Router) · SSE · Recharts |
| **Live demo** | API → Render/Fly · Web → Vercel · Redis → Upstash _(all free tier)_ |
| **The "wow"** | Drag a traffic slider → watch the token bucket drain → requests flip red at the threshold |

---

## 1. The core thing to visualize

The concept is the **token bucket**: a bucket holds up to `capacity` tokens, refills at `refillRate`
tokens/sec. Each request costs 1 token. If a token is available → **allow (200)**; if empty →
**reject (429)** with a `Retry-After`.

The frontend must show, in real time:
1. **The bucket** — a vertical gauge of tokens, draining as requests hit, refilling on a timer.
2. **A request stream** — a live row of dots, green for `200`, red for `429`, scrolling left.
3. **A throughput chart** — allowed/sec vs rejected/sec over a rolling window.
4. **A traffic control** — a slider (1–50 req/s) so the user *drives* the load and sees the limit kick in.
5. **Live headers** — current `X-RateLimit-Remaining`, `X-RateLimit-Limit`, last `Retry-After`.

When the user pushes the slider past `refillRate`, the bucket visibly empties and the stream goes red.
That single moment is the whole showcase.

---

## 2. Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│  Web (Next.js / Vercel)     │  SSE    │  API (NestJS / Render)   │
│  - traffic generator        │ ◀────── │  - /api/work (limited)   │
│  - token-bucket gauge       │  fetch  │  - /api/events (SSE)     │
│  - request stream + chart   │ ──────▶ │  - RateLimiterGuard      │
└─────────────────────────────┘         │        │                 │
                                         │        ▼                 │
                                         │  TokenBucket (domain)    │
                                         │   ├─ RedisStore (Lua)  ──┼──▶ Upstash Redis
                                         │   └─ MemoryStore (tests) │
                                         └──────────────────────────┘
```

**Clean-architecture seams (so it reads as senior, not a tutorial):**
- `TokenBucketLimiter` is **pure domain logic** with a `RateLimitStore` port (interface).
- Two adapters implement the port: `RedisStore` (prod, atomic Lua script) and `MemoryStore` (tests).
- The NestJS `RateLimiterGuard` is a thin delivery-layer wrapper — it knows nothing about Redis.
- This lets the same limiter run in unit tests with zero infrastructure.

---

## 3. Repo structure (pnpm monorepo)

```
api-rate-limiting/
├── apps/
│   ├── api/                      # NestJS
│   │   ├── src/
│   │   │   ├── rate-limit/
│   │   │   │   ├── domain/
│   │   │   │   │   ├── token-bucket.ts          # pure algorithm
│   │   │   │   │   ├── rate-limit-store.port.ts  # interface
│   │   │   │   │   └── token-bucket.spec.ts      # unit tests (no infra)
│   │   │   │   ├── infra/
│   │   │   │   │   ├── redis.store.ts            # Lua-script adapter
│   │   │   │   │   ├── memory.store.ts
│   │   │   │   │   └── token-bucket.lua
│   │   │   │   ├── rate-limiter.guard.ts
│   │   │   │   ├── rate-limit.decorator.ts       # @RateLimit({ capacity, refillRate })
│   │   │   │   ├── rate-limit.events.ts          # event emitter for SSE
│   │   │   │   └── rate-limit.module.ts
│   │   │   ├── work/work.controller.ts           # the limited endpoint
│   │   │   ├── events/events.controller.ts       # SSE stream
│   │   │   ├── health/health.controller.ts       # @nestjs/terminus
│   │   │   └── main.ts
│   │   └── test/                                  # e2e + Testcontainers integration
│   └── web/                       # Next.js App Router
│       ├── app/
│       │   └── page.tsx                           # the dashboard
│       ├── components/
│       │   ├── TokenBucketGauge.tsx
│       │   ├── RequestStream.tsx
│       │   ├── ThroughputChart.tsx
│       │   └── TrafficControl.tsx
│       └── lib/
│           ├── traffic-generator.ts               # drives N req/s, AbortController
│           └── use-rate-limit-stream.ts           # SSE hook
├── packages/
│   └── shared/                    # shared TS types (RateLimitEvent, config)
├── simulate/load.js               # k6 — proves the threshold under traffic
├── docs/
│   ├── architecture.md
│   └── adr/
│       ├── 0001-token-bucket-vs-sliding-window.md
│       └── 0002-atomicity-via-lua-vs-multi-exec.md
├── devlog.md
├── docker-compose.yml             # api + redis (web runs via pnpm dev)
├── turbo.json / pnpm-workspace.yaml
└── README.md
```

---

## 4. Key implementation details (the parts that matter)

### 4a. Pure token-bucket algorithm (`domain/token-bucket.ts`)
Stateless function over `(now, state, capacity, refillRate)` → `{ allowed, remaining, retryAfterMs, newState }`.
Pure = trivially unit-testable with a fake clock. No Redis, no Nest.

### 4b. Atomic Redis adapter (`infra/token-bucket.lua`)
The whole point of "distributed": the read-compute-write must be **atomic**, or concurrent requests
double-spend tokens. Do it in a single Lua script (Redis runs it atomically):

```lua
-- KEYS[1]=bucket key  ARGV: now_ms, capacity, refill_per_sec, cost
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or tonumber(ARGV[2])   -- start full
local ts     = tonumber(b[2]) or tonumber(ARGV[1])
local refill = (tonumber(ARGV[1]) - ts) / 1000 * tonumber(ARGV[3])
tokens = math.min(tonumber(ARGV[2]), tokens + refill)
local allowed = tokens >= tonumber(ARGV[4])
if allowed then tokens = tokens - tonumber(ARGV[4]) end
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', ARGV[1])
redis.call('PEXPIRE', KEYS[1], 60000)
return { allowed and 1 or 0, tokens }   -- ← also feeds the FE gauge
```

> **ADR 0002** captures *why Lua, not WATCH/MULTI/EXEC* — single round-trip, no retry loop, atomic.

### 4c. Guard + headers + events
- `RateLimiterGuard` resolves the bucket key (IP, or a `demo-session` header so the dashboard is isolated),
  calls the store, sets `X-RateLimit-Limit/Remaining` + `Retry-After`, throws `429` when blocked.
- On every decision it emits a `RateLimitEvent` ({ allowed, remaining, ts, key }) to an in-process
  event bus → streamed to the FE over SSE. **This is the bridge that makes the bucket visible.**

### 4d. SSE stream (`events.controller.ts`)
NestJS `@Sse('events')` returns an `Observable<RateLimitEvent>`. The FE subscribes and animates.
(SSE over WebSocket here: one-way server→client, auto-reconnect, trivial on free tier.)

### 4e. Frontend visualization (the deliverable)
- **`TrafficControl`** — slider sets target req/s; `traffic-generator.ts` fires `fetch('/api/work')`
  on an interval with an `AbortController` for clean stop.
- **`TokenBucketGauge`** — animated fill height = `remaining/capacity`, driven by SSE events
  (Framer Motion or CSS transition). Refill animates between events.
- **`RequestStream`** — horizontally scrolling dots; green `200`, red `429`. Pure visual proof.
- **`ThroughputChart`** — Recharts area chart, allowed vs rejected per second, rolling 30s.
- All client components, `'use client'`; the page shell is a Server Component. Strict typing via
  `packages/shared`.

---

## 5. Phased checklist

### Phase 0 — Scaffold & hygiene
- [ ] `pnpm` workspace + Turborepo; strict `tsconfig`, ESLint (typescript-eslint), Prettier, Husky pre-commit
- [ ] `docker-compose.yml` (Redis); `.env.example`; conventional-commits
- [ ] CI: lint + typecheck + test on push

### Phase 1 — Backend core
- [ ] Pure `TokenBucket` + unit tests (fake clock, edge cases: empty, exact-capacity, burst)
- [ ] `RateLimitStore` port + `MemoryStore`
- [ ] `RedisStore` with Lua script + Testcontainers integration test (concurrent requests don't double-spend)
- [ ] `@RateLimit()` decorator + `RateLimiterGuard` + standard headers
- [ ] `/api/work` (limited), `/health`; e2e test asserting 200→429 transition

### Phase 2 — Live events
- [ ] In-process event bus + `RateLimitEvent` in `packages/shared`
- [ ] `@Sse('/api/events')` stream; CORS for the web origin

### Phase 3 — Frontend visualization
- [ ] Next.js App Router app; SSE hook with reconnect
- [ ] `TrafficControl` slider + traffic generator (AbortController, backpressure-safe)
- [ ] `TokenBucketGauge`, `RequestStream`, `ThroughputChart`
- [ ] Empty/error states; responsive; light/dark; a11y on the control

### Phase 4 — Simulation (proof under load)
- [ ] `simulate/load.js` (k6): ramp RPS past `refillRate`, assert 429s appear at the threshold,
      assert `Retry-After` present, p95 stays low
- [ ] Capture result → metrics table + a GIF of the dashboard going red → into README

### Phase 5 — Deploy & document
- [ ] Upstash Redis; API → Render/Fly; Web → Vercel (env: `NEXT_PUBLIC_API_URL`)
- [ ] ADR 0001 (token bucket vs sliding window vs fixed window) + ADR 0002 (Lua atomicity)
- [ ] `docs/architecture.md` diagram; README with live links + simulation result
- [ ] `devlog.md` kickoff entry; blog post on the portfolio
- [ ] Cross-link repo ↔ blog ↔ live URL three ways

---

## 6. Best-practices bar (clean code)
- **Hexagonal seam**: domain logic has zero framework/infra imports; adapters behind ports.
- **Strict TS** everywhere; shared types in one package — no `any`, no FE/BE type drift.
- **Tests at the right level**: pure unit (algorithm), integration (real Redis via Testcontainers),
  e2e (HTTP contract). Not just one layer.
- **12-factor config** via `@nestjs/config` + Zod validation of env at boot.
- **Observability hook**: structured logs (pino) with the limiter decision — small, but on-brand.
- **Graceful shutdown** + `/health` (readiness checks Redis).
- **Security**: CORS allowlist, helmet, validate the `demo-session` header, cap traffic-generator RPS server-side too (don't trust the client).

## 7. Definition of done
- [ ] Live web URL where dragging the slider visibly drains the bucket and flips requests to 429
- [ ] Live API URL with `X-RateLimit-*` + `Retry-After` headers
- [ ] k6 result + dashboard GIF in README proving the threshold
- [ ] 2 ADRs + architecture diagram
- [ ] CI green; published blog post linked

## 8. Stretch (only if quick)
- [ ] Algorithm toggle in the UI: token bucket vs sliding-window vs fixed-window (shows the boundary
      burst problem visually) — this alone is a great second blog post.
- [ ] Per-key visualization (multiple buckets) to show distributed isolation.

---

### Estimated effort
~1.5–2 focused days: BE core + Redis Lua (½ day), SSE + FE visualization (¾ day), sim + deploy + write-up (½ day).
