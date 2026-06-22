import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '@repo/shared';

export const RATE_LIMIT_KEY = 'rate_limit_config';

/**
 * Override the rate-limit config for a route or controller.
 * Anything omitted falls back to the env defaults resolved in the guard.
 *
 * @example @RateLimit({ capacity: 5, refillPerSec: 1 })
 */
export const RateLimit = (config: Partial<RateLimitConfig>) =>
  SetMetadata(RATE_LIMIT_KEY, config);
