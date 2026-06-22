import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimiterGuard } from './rate-limiter.guard';

/**
 * The protected endpoint the dashboard hammers. The guard does all the work;
 * a 200 means a token was spent, a 429 means the bucket was empty.
 */
@Controller('api')
@UseGuards(RateLimiterGuard)
export class WorkController {
  @Get('work')
  work(): { ok: true; ts: number } {
    return { ok: true, ts: Date.now() };
  }
}
