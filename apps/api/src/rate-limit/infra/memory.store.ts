import { Injectable } from '@nestjs/common';
import {
  RateLimitStore,
  StoreDecision,
} from '../domain/rate-limit-store.port';
import { BucketState, ConsumeParams, consume } from '../domain/token-bucket';

/**
 * In-process store — correct only within a single instance.
 * Used in tests (and as a fallback), it reuses the exact domain algorithm.
 */
@Injectable()
export class MemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, BucketState>();

  async consume(key: string, params: ConsumeParams): Promise<StoreDecision> {
    const result = consume(Date.now(), this.buckets.get(key) ?? null, params);
    this.buckets.set(key, result.state);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      retryAfterMs: result.retryAfterMs,
    };
  }
}
