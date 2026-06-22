/**
 * Pure token-bucket algorithm — no framework, no I/O, no clock of its own.
 * Everything is a function of (now, previous state, params), which makes it
 * trivially unit-testable with a fake clock and keeps the logic identical to
 * the Redis Lua implementation in `infra/token-bucket.lua.ts`.
 */

export interface BucketState {
  /** Tokens currently in the bucket (fractional). */
  tokens: number;
  /** Epoch milliseconds of the last update. */
  ts: number;
}

export interface ConsumeParams {
  /** Maximum tokens (burst ceiling). */
  capacity: number;
  /** Tokens refilled per second (sustained rate). */
  refillPerSec: number;
  /** Tokens this request costs (default 1). */
  cost?: number;
}

export interface ConsumeResult {
  allowed: boolean;
  /** Tokens left after this decision (fractional). */
  remaining: number;
  /** Milliseconds until enough tokens exist for this request (0 when allowed). */
  retryAfterMs: number;
  /** The new state to persist. */
  state: BucketState;
}

/**
 * Decide whether a request may proceed, refilling lazily based on elapsed time.
 * A fresh bucket (no previous state) starts full.
 */
export function consume(
  now: number,
  previous: BucketState | null,
  params: ConsumeParams,
): ConsumeResult {
  const cost = params.cost ?? 1;
  const { capacity, refillPerSec } = params;

  const last = previous ?? { tokens: capacity, ts: now };
  const elapsedSec = Math.max(0, (now - last.ts) / 1000);

  let tokens = Math.min(capacity, last.tokens + elapsedSec * refillPerSec);

  const allowed = tokens >= cost;
  if (allowed) tokens -= cost;

  const retryAfterMs = allowed
    ? 0
    : Math.ceil(((cost - tokens) / refillPerSec) * 1000);

  return { allowed, remaining: tokens, retryAfterMs, state: { tokens, ts: now } };
}
