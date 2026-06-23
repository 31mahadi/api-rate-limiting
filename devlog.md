# Devlog — api-rate-limiting

A running timeline of how this showcase was built. Mirrored as a blog post on the portfolio.

## 2026-06-22 — v0.1: end-to-end working
Built the first cut, fully runnable via a single Docker infra.

- **Monorepo** (npm workspaces): `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (types).
- **Algorithm:** pure token-bucket domain function + unit tests (fake clock), mirrored by an atomic
  Redis Lua script so concurrent requests can't double-spend tokens. (ADRs 0001, 0002.)
- **API:** Zod-validated config, Redis module with graceful shutdown, `/health` (terminus),
  `RateLimiterGuard` setting `X-RateLimit-*` / `Retry-After`, `/api/work`, `/api/config`,
  and an SSE `/api/events` stream of every decision.
- **Web:** live dashboard — token-bucket gauge (rAF smooth refill), request stream (green/red),
  throughput chart, and a traffic slider that drives load against the API.
- **Docker:** multi-stage images; `docker compose up` runs redis + api + web; k6 under a `sim` profile.

### Verified
- Capacity-10 burst → exactly **10× 200 then 10× 429**, with `Retry-After`.
- k6 at **25 req/s vs 5/s refill** → ~5.5 served/s (tracks refill), **78% throttled**, limiter engaged.
- Testcontainers: **100 concurrent requests → exactly 20 allowed** on a capacity-20 bucket (no double-spend).

### Next
- Deploy: reuse the portfolio's Upstash + API on Render + web on Vercel; capture a dashboard GIF.
- Stretch: UI toggle to contrast token-bucket vs fixed-window boundary burst.
