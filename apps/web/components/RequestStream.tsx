'use client';

import type { RateLimitEvent } from '@repo/shared';

/** A scrolling wall of recent decisions — green allowed, red blocked. */
export function RequestStream({ events }: { events: RateLimitEvent[] }) {
  const recent = events.slice(-90);

  return (
    <div>
      <div className="stream">
        {recent.length === 0 ? (
          <span className="empty-note">Start traffic to see requests…</span>
        ) : (
          recent.map((e, i) => (
            <span
              key={`${e.ts}-${i}`}
              className={`pip ${e.allowed ? 'ok' : 'no'}`}
              title={`${e.allowed ? '200 OK' : '429 Too Many'} · ${e.remaining.toFixed(1)} left`}
            />
          ))
        )}
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--green)' }} /> 200 allowed
        </span>
        <span>
          <i style={{ background: 'var(--red)' }} /> 429 throttled
        </span>
      </div>
    </div>
  );
}
