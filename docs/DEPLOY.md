# Deploy (free) — Vercel + Render + Upstash, env managed by Doppler

The goal: **one place to manage env** (Doppler), shared backing services across all showcase
repos, and per-app PaaS deploys. You edit a secret once in Doppler and it syncs to both platforms.

```
            ┌───────── Doppler (single source of truth) ─────────┐
            │  project: api-rate-limiting   config: prd          │
            └───────┬───────────────────────────────┬────────────┘
            sync    │                                │ sync
                    ▼                                ▼
            Vercel (web)                       Render (api)  ──► Upstash Redis (shared w/ portfolio)
            NEXT_PUBLIC_API_URL                REDIS_URL, CORS_ORIGIN, RATE_LIMIT_*
```

## One-time shared setup (reused by every repo)
1. **Upstash Redis** — reuse the portfolio's existing database; the `REDIS_URL` is already in
   `Portfolio/.env`. Demos share it, namespaced by key prefix (this repo uses `rl:`), so keys never
   collide. No new account or database needed.
2. **Doppler** — create an account (free Developer plan). Install the CLI: `brew install dopplerhq/cli/doppler`.

> ⚠️ **Load tests stay local.** Upstash's free tier has a shared **~500K commands/day** cap across
> the whole account. Keep the **live demo** on the shared Upstash (interactive slider traffic is
> light), but run the **k6 load test locally** against the Docker Redis (`npm run simulate`) so it
> never eats the portfolio's quota. The proof numbers in the README come from the local run anyway.

## Per-repo setup (this repo as the template)

### 1. Doppler project
- New project **`api-rate-limiting`**, config **`prd`**. Add secrets:
  - `REDIS_URL` = the portfolio's Upstash `rediss://…` URL (copy from `Portfolio/.env`)
  - `RATE_LIMIT_CAPACITY` = `10`
  - `RATE_LIMIT_REFILL_PER_SEC` = `5`
  - `CORS_ORIGIN` = _(fill after Vercel deploy)_
  - `NEXT_PUBLIC_API_URL` = _(fill after Render deploy)_

### 2. API → Render
- New → **Blueprint**, point at this repo (`render.yaml` is picked up automatically).
- In Doppler, add the **Render integration** and sync config `prd` → the `api-rate-limiting` service.
  (`REDIS_URL` and `CORS_ORIGIN` flow in; `RATE_LIMIT_*` are already in the blueprint.)
- Deploy. Note the URL, e.g. `https://api-rate-limiting.onrender.com`.

### 3. Web → Vercel
- New Project → import this repo. Settings:
  - **Root Directory:** repo root (leave default)
  - **Framework:** Next.js
  - **Build Command:** `npm run build:shared && npm run build -w @repo/web`
  - **Output Directory:** `apps/web/.next`
- In Doppler, add the **Vercel integration** and sync `prd` → this Vercel project.
- Deploy. Note the URL, e.g. `https://api-rate-limiting.vercel.app`.

### 4. Wire the two together (edit once, in Doppler)
- Set `NEXT_PUBLIC_API_URL` = the Render URL → **redeploy web** (it's a build-time value).
- Set `CORS_ORIGIN` = the Vercel URL → Render redeploys automatically.

Done. Live demo at the Vercel URL.

## Automation — what runs on every push (all free)
After the one-time linking above, the pipeline is hands-off:
- **GitHub Actions** (`.github/workflows/ci.yml`) — typecheck, unit + Testcontainers integration tests,
  and a Docker build, on every push/PR. Free for public repos.
- **Render** — `autoDeploy: true` in `render.yaml` redeploys the API on every push to `main`.
- **Vercel** — its native git integration redeploys the web app on every push.
- **Doppler** — its Render/Vercel integrations keep env in sync; no dashboard edits.

The only thing that isn't automatable is the first link (creating the projects / connecting accounts),
because that's where the credentials are established. Everything after a push is automatic.

## Notes
- Render free web services **spin down after ~15 min idle**; the first request (and the SSE stream)
  cold-starts in a few seconds. Fine for a demo. For always-on, swap Render for a small Fly Machine.
- `NEXT_PUBLIC_*` is inlined at build time — changing it in Doppler requires a web redeploy.
- ioredis enables TLS automatically for the `rediss://` Upstash URL — no code change.

## Reusable pattern for the other repos
Every showcase repo follows the same 5 steps:
1. One Doppler project (`<repo-name>`), config `prd`.
2. Reuse the portfolio's Upstash / Supabase (`REDIS_URL` / `DATABASE_URL`, namespaced per repo); run load-heavy sims locally.
3. API → Render blueprint + Doppler→Render sync.
4. Web → Vercel + Doppler→Vercel sync.
5. Cross-link `NEXT_PUBLIC_API_URL` ↔ `CORS_ORIGIN`.

You only ever manage env in Doppler — the platforms are just sync targets.
