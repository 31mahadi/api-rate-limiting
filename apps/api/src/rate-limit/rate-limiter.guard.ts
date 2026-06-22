import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  RateLimitConfig,
  RateLimitHeaders,
  SESSION_HEADER,
} from '@repo/shared';
import { RATE_LIMIT_KEY } from './rate-limit.decorator';
import { RateLimiterService } from './rate-limiter.service';

/**
 * Delivery-layer adapter: resolves the bucket config + key, calls the limiter,
 * sets the standard headers, and turns an empty bucket into a 429. It knows
 * nothing about Redis or the algorithm — that lives behind the service/store.
 */
@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiterService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const override =
      this.reflector.getAllAndOverride<Partial<RateLimitConfig>>(
        RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? {};

    const cfg: RateLimitConfig = {
      capacity:
        override.capacity ??
        this.config.getOrThrow<number>('RATE_LIMIT_CAPACITY'),
      refillPerSec:
        override.refillPerSec ??
        this.config.getOrThrow<number>('RATE_LIMIT_REFILL_PER_SEC'),
    };

    const decision = await this.limiter.consume(this.resolveKey(req), cfg);

    res.setHeader(RateLimitHeaders.Limit, cfg.capacity);
    res.setHeader(RateLimitHeaders.Remaining, Math.max(0, Math.floor(decision.remaining)));

    if (decision.allowed) return true;

    res.setHeader(
      RateLimitHeaders.RetryAfter,
      Math.ceil(decision.retryAfterMs / 1000),
    );
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        retryAfterMs: decision.retryAfterMs,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** One bucket per demo session (so each dashboard visitor is isolated), else per IP. */
  private resolveKey(req: Request): string {
    const session = (req.headers[SESSION_HEADER] as string | undefined)?.trim();
    if (session) return `session:${session}`;
    return `ip:${req.ip ?? 'unknown'}`;
  }
}
