import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { RateLimitEvent } from '@repo/shared';

/**
 * In-process pub/sub for limiter decisions. Every decision is published here
 * and streamed to the dashboard over SSE — this is the bridge that makes the
 * token bucket *visible*.
 */
@Injectable()
export class RateLimitEventBus {
  private readonly subject = new Subject<RateLimitEvent>();

  emit(event: RateLimitEvent): void {
    this.subject.next(event);
  }

  stream(): Observable<RateLimitEvent> {
    return this.subject.asObservable();
  }
}
