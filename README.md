# api-rate-limiting

> **A distributed API rate limiter you can _watch_ work.**
> A Redis token-bucket limiter in **NestJS**, with a live **Next.js** dashboard that visualizes the
> bucket draining/refilling and requests flipping red (`429`) the instant traffic crosses the limit.

Part of my backend showcase series — backend-heavy, with a real frontend whose job is to make the
core concept _visible_.

| | |
|---|---|
| **Stack** | NestJS · TypeScript · Redis · Next.js · SSE · npm workspaces |
| **Run** | `docker compose up --build` — single Docker infra (redis + api + web) |
| **Web** | http://localhost:5173 |
| **API** | http://localhost:3000 |
| **Simulate** | `npm run simulate` — k6 load test (runs in Docker) |

## Quick start

```bash
cp .env.example .env
docker compose up --build
# open http://localhost:5173 and drag the traffic slider past the refill rate
```

Everything runs in Docker — you don't need Node, Redis, or k6 installed locally.

## What it proves
See [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) and [`docs/`](./docs).

## Layout
```
apps/api      NestJS — token-bucket limiter, guard, SSE event stream
apps/web      Next.js — live visualization dashboard
packages/shared  shared TypeScript types (no FE/BE drift)
simulate      k6 load scenario
docs          architecture + ADRs
```
