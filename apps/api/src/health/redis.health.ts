import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';

/** Readiness depends on Redis — a `PING` round-trip gates "ready". */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS) private readonly client: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.client.ping();
      const ok = pong === 'PONG';
      const result = this.getStatus(key, ok);
      if (ok) return result;
      throw new HealthCheckError('Redis ping failed', result);
    } catch (err) {
      throw new HealthCheckError(
        'Redis unreachable',
        this.getStatus(key, false, {
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
