import { Module } from '@nestjs/common';
import { RATE_LIMIT_STORE } from './domain/rate-limit-store.port';
import { RedisStore } from './infra/redis.store';
import { RateLimitEventBus } from './rate-limit.events';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimiterGuard } from './rate-limiter.guard';
import { WorkController } from './work.controller';
import { EventsController } from './events.controller';

@Module({
  controllers: [WorkController, EventsController],
  providers: [
    RateLimiterService,
    RateLimiterGuard,
    RateLimitEventBus,
    { provide: RATE_LIMIT_STORE, useClass: RedisStore },
  ],
})
export class RateLimitModule {}
