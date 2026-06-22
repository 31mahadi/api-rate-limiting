import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RateLimitConfig, RateLimitHeaders, SESSION_HEADER } from '@repo/shared';
import { RateLimiterService } from './rate-limiter.service';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const cfg: RateLimitConfig = {
      capacity: this.config.getOrThrow<number>('RATE_LIMIT_CAPACITY'),
      refillPerSec: this.config.getOrThrow<number>('RATE_LIMIT_REFILL_PER_SEC'),
    };

    const decision = await this.limiter.consume(this.resolveKey(req), cfg);

    res.setHeader(RateLimitHeaders.Limit, cfg.capacity);
    res.setHeader(RateLimitHeaders.Remaining, Math.max(0, Math.floor(decision.remaining)));

    if (decision.allowed) return true;

    res.setHeader(RateLimitHeaders.RetryAfter, Math.ceil(decision.retryAfterMs / 1000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        retryAfterMs: decision.retryAfterMs,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // one bucket per demo session, falling back to client IP
  private resolveKey(req: Request): string {
    const session = (req.headers[SESSION_HEADER] as string | undefined)?.trim();
    return session ? `session:${session}` : `ip:${req.ip ?? 'unknown'}`;
  }
}
