import { Inject, Injectable } from '@nestjs/common';
import { RateLimitConfig, RateLimitDecision } from '@repo/shared';
import {
  RateLimitStore,
  RATE_LIMIT_STORE,
} from './domain/rate-limit-store.port';
import { RateLimitEventBus } from './rate-limit.events';

/**
 * Orchestrates a limiter decision: ask the store, publish the event for the
 * live dashboard, and return the decision to the guard.
 */
@Injectable()
export class RateLimiterService {
  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    private readonly bus: RateLimitEventBus,
  ) {}

  async consume(key: string, config: RateLimitConfig): Promise<RateLimitDecision> {
    const { allowed, remaining, retryAfterMs } = await this.store.consume(key, {
      capacity: config.capacity,
      refillPerSec: config.refillPerSec,
    });

    this.bus.emit({
      key,
      allowed,
      remaining,
      limit: config.capacity,
      capacity: config.capacity,
      refillPerSec: config.refillPerSec,
      ts: Date.now(),
    });

    return { allowed, remaining, limit: config.capacity, retryAfterMs };
  }
}
