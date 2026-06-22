export interface BucketState {
  tokens: number;
  ts: number;
}

export interface ConsumeParams {
  capacity: number;
  refillPerSec: number;
  cost?: number;
}

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  state: BucketState;
}

// Pure token bucket: a function of (now, previous state, params) so it mirrors
// the Redis Lua script and stays testable with a fake clock. A fresh bucket is full.
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
