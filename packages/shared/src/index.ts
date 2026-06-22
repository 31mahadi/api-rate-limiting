/**
 * Shared contract between the API and the web dashboard.
 * Single source of truth so the FE and BE never drift.
 */

/** Configuration of a single token bucket. */
export interface RateLimitConfig {
  /** Maximum tokens the bucket can hold (the burst ceiling). */
  capacity: number;
  /** Tokens added back per second (the sustained rate). */
  refillPerSec: number;
}

/** The outcome of a single rate-limit decision. */
export interface RateLimitDecision {
  allowed: boolean;
  /** Tokens left in the bucket after this decision (fractional). */
  remaining: number;
  /** The bucket capacity, echoed for convenience. */
  limit: number;
  /** Milliseconds until the next token is available (0 when allowed). */
  retryAfterMs: number;
}

/**
 * An event emitted on every limiter decision and streamed to the dashboard over SSE.
 * This is what drives the live visualization.
 */
export interface RateLimitEvent {
  /** Bucket identity (the demo session id). */
  key: string;
  allowed: boolean;
  remaining: number;
  limit: number;
  capacity: number;
  refillPerSec: number;
  /** Epoch milliseconds when the decision was made. */
  ts: number;
}

/** HTTP header names used to expose limiter state to clients. */
export const RateLimitHeaders = {
  Limit: 'X-RateLimit-Limit',
  Remaining: 'X-RateLimit-Remaining',
  RetryAfter: 'Retry-After',
} as const;

/** Header the dashboard sends to isolate its own bucket from other visitors. */
export const SESSION_HEADER = 'x-demo-session';
