import { ConsumeParams } from './token-bucket';

/** The decision returned to the delivery layer (state stays inside the store). */
export interface StoreDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Port: how the limiter persists and mutates bucket state.
 * Adapters: RedisStore (prod, atomic) and MemoryStore (tests, single-process).
 */
export interface RateLimitStore {
  consume(key: string, params: ConsumeParams): Promise<StoreDecision>;
}

/** DI token for the active store implementation. */
export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';
