import { Controller, Get, MessageEvent, Sse } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';
import { RateLimitConfig } from '@repo/shared';
import { RateLimitEventBus } from './rate-limit.events';

@Controller('api')
export class EventsController {
  constructor(
    private readonly bus: RateLimitEventBus,
    private readonly config: ConfigService,
  ) {}

  /** Live stream of every limiter decision — the dashboard subscribes here. */
  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.bus.stream().pipe(map((event) => ({ data: event })));
  }

  /** The active bucket config, so the dashboard can scale the gauge correctly. */
  @Get('config')
  rateLimitConfig(): RateLimitConfig {
    return {
      capacity: this.config.getOrThrow<number>('RATE_LIMIT_CAPACITY'),
      refillPerSec: this.config.getOrThrow<number>('RATE_LIMIT_REFILL_PER_SEC'),
    };
  }
}
