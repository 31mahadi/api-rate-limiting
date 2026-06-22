'use client';

import { useEffect, useState } from 'react';
import type { RateLimitEvent } from '@repo/shared';

const WINDOW_SECONDS = 30;
const W = 300;
const H = 150;

interface Bucket {
  allowed: number;
  rejected: number;
}

export function ThroughputChart({ events }: { events: RateLimitEvent[] }) {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  const buckets: Bucket[] = Array.from({ length: WINDOW_SECONDS }, () => ({
    allowed: 0,
    rejected: 0,
  }));
  const start = nowSec - WINDOW_SECONDS + 1;

  for (const e of events) {
    const idx = Math.floor(e.ts / 1000) - start;
    if (idx >= 0 && idx < WINDOW_SECONDS) {
      if (e.allowed) buckets[idx].allowed += 1;
      else buckets[idx].rejected += 1;
    }
  }

  const max = Math.max(1, ...buckets.map((b) => b.allowed + b.rejected));
  const bw = W / WINDOW_SECONDS;
  const scale = (n: number) => (n / max) * (H - 10);
  const hasData = buckets.some((b) => b.allowed + b.rejected > 0);

  return (
    <div className="chart">
      {!hasData && <p className="empty-note">Waiting for traffic…</p>}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="throughput">
        {buckets.map((b, i) => {
          const x = i * bw + 1;
          const aH = scale(b.allowed);
          const rH = scale(b.rejected);
          return (
            <g key={i}>
              <rect x={x} y={H - aH} width={bw - 2} height={aH} fill="var(--green)" rx="1" />
              <rect x={x} y={H - aH - rH} width={bw - 2} height={rH} fill="var(--red)" rx="1" />
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--green)' }} /> served/s
        </span>
        <span>
          <i style={{ background: 'var(--red)' }} /> throttled/s
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)' }}>peak {max}/s</span>
      </div>
    </div>
  );
}
