import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS } from '../../redis/redis.module';
import {
  RateLimitStore,
  StoreDecision,
} from '../domain/rate-limit-store.port';
import { ConsumeParams } from '../domain/token-bucket';
import { TOKEN_BUCKET_LUA } from './token-bucket.lua';

/** Signature of the custom command we register on the client. */
interface TokenBucketCommand {
  tokenBucket(
    key: string,
    now: number,
    capacity: number,
    refillPerSec: number,
    cost: number,
  ): Promise<[number, string]>;
}

/**
 * Distributed store: a single atomic Lua script does the whole decision in
 * Redis, so concurrent requests across instances can't double-spend tokens.
 */
@Injectable()
export class RedisStore implements RateLimitStore, OnModuleInit {
  private readonly prefix = 'rl:';

  constructor(@Inject(REDIS) private readonly client: Redis) {}

  private get scripted(): TokenBucketCommand {
    return this.client as unknown as TokenBucketCommand;
  }

  onModuleInit(): void {
    if (!('tokenBucket' in this.client)) {
      this.client.defineCommand('tokenBucket', {
        numberOfKeys: 1,
        lua: TOKEN_BUCKET_LUA,
      });
    }
  }

  async consume(key: string, params: ConsumeParams): Promise<StoreDecision> {
    const cost = params.cost ?? 1;
    const now = Date.now();

    const [allowedFlag, tokensStr] = await this.scripted.tokenBucket(
      this.prefix + key,
      now,
      params.capacity,
      params.refillPerSec,
      cost,
    );

    const allowed = allowedFlag === 1;
    const remaining = Number.parseFloat(tokensStr);
    const retryAfterMs = allowed
      ? 0
      : Math.ceil(((cost - remaining) / params.refillPerSec) * 1000);

    return { allowed, remaining, retryAfterMs };
  }
}
