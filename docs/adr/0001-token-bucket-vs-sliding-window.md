# ADR 0001 — Token bucket over sliding/fixed window

- **Status:** accepted
- **Date:** 2026-06-22

## Context
We need a rate-limiting algorithm that (a) allows short bursts, (b) enforces a sustained rate, and
(c) is cheap to compute and store per key. The common options:

- **Fixed window** — count requests per calendar window (e.g. per second). Simple, but allows a
  *boundary burst*: 2× the limit across the window edge (N at 0.999s, N at 1.001s).
- **Sliding window log** — store every request timestamp; exact, but O(n) memory per key.
- **Sliding window counter** — approximation of the log; better, but still more state and math.
- **Token bucket** — a bucket of `capacity` tokens refilling at `refillPerSec`; each request spends
  one. Naturally models "burst up to capacity, then sustain at the refill rate".

## Decision
Use a **token bucket**. It needs only two numbers per key (`tokens`, `ts`), refills lazily on read
(no background timer), and expresses burst + sustained rate in one model — which is also exactly
what the dashboard visualizes.

## Alternatives considered
- *Fixed window* — rejected: boundary-burst lets clients double the intended rate.
- *Sliding window log* — rejected: unbounded per-key memory; overkill for this use case.

## Consequences
- Two fields per key, refilled by elapsed-time math — trivial to store in Redis and to reason about.
- "Burst" is a first-class, tunable concept (`capacity`), separate from sustained rate (`refillPerSec`).
- The exact same arithmetic lives in the pure domain function and the Lua script, so tests cover both.
- A stretch goal keeps the door open to *show* the fixed-window boundary burst in the UI for contrast.
