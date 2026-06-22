import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimiterGuard } from './rate-limiter.guard';

@Controller('api')
@UseGuards(RateLimiterGuard)
export class WorkController {
  @Get('work')
  work(): { ok: true; ts: number } {
    return { ok: true, ts: Date.now() };
  }
}
