import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { RateLimitEvent } from '@repo/shared';

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
