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

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.bus.stream().pipe(map((event) => ({ data: event })));
  }

  @Get('config')
  rateLimitConfig(): RateLimitConfig {
    return {
      capacity: this.config.getOrThrow<number>('RATE_LIMIT_CAPACITY'),
      refillPerSec: this.config.getOrThrow<number>('RATE_LIMIT_REFILL_PER_SEC'),
    };
  }
}
