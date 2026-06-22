import { ConsumeParams } from './token-bucket';

export interface StoreDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimitStore {
  consume(key: string, params: ConsumeParams): Promise<StoreDecision>;
}

export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';
