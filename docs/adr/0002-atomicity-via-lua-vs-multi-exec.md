# ADR 0002 — Atomicity via a Redis Lua script, not WATCH/MULTI/EXEC

- **Status:** accepted
- **Date:** 2026-06-22

## Context
A token-bucket decision is **read-compute-write**: read `tokens`/`ts`, refill by elapsed time,
check/decrement, write back. Across concurrent requests (and multiple API instances sharing one
Redis), this must be atomic — otherwise two requests read the same token count and both succeed,
spending one token twice (a classic lost-update / double-spend).

Options for atomicity in Redis:
1. **WATCH/MULTI/EXEC** optimistic transaction with a client-side retry loop on contention.
2. **A Lua script**, which Redis executes atomically as a single, uninterruptible operation.

## Decision
Implement the whole decision in a **Lua script** (`infra/token-bucket.lua.ts`), registered once via
ioredis `defineCommand`. One round-trip, no retry loop, no interleaving.

## Alternatives considered
- *WATCH/MULTI/EXEC* — rejected: needs a retry loop under contention (more round-trips, more latency,
  more code), and the hot key is exactly where contention concentrates.
- *App-level lock (Redlock)* — rejected: heavier and slower than making the operation itself atomic.

## Consequences
- The hot path is a single atomic Redis call; correct under concurrency by construction.
- The algorithm is duplicated in two languages (TS domain + Lua). We accept this and pin them
  together with tests; the Lua is the source of truth in production, the TS mirror keeps it testable.
- Fractional tokens are returned to the app as a string to avoid Lua→Redis integer truncation, so the
  dashboard gauge can show a smooth, fractional level.
