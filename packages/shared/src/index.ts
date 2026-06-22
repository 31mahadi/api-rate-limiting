export interface RateLimitConfig {
  capacity: number;
  refillPerSec: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
}

export interface RateLimitEvent {
  key: string;
  allowed: boolean;
  remaining: number;
  limit: number;
  capacity: number;
  refillPerSec: number;
  ts: number;
}

export const RateLimitHeaders = {
  Limit: 'X-RateLimit-Limit',
  Remaining: 'X-RateLimit-Remaining',
  RetryAfter: 'Retry-After',
} as const;

export const SESSION_HEADER = 'x-demo-session';
