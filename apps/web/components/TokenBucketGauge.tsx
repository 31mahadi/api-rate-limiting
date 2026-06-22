'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  capacity: number;
  refillPerSec: number;
  remaining: number;
  since: number;
}

export function TokenBucketGauge({ capacity, refillPerSec, remaining, since }: Props) {
  const [tokens, setTokens] = useState(remaining);
  const stateRef = useRef({ remaining, since });
  stateRef.current = { remaining, since };

  // Estimate the refill between server events so the level rises smoothly.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { remaining: base, since: ts } = stateRef.current;
      const elapsed = (Date.now() - ts) / 1000;
      setTokens(Math.min(capacity, base + elapsed * refillPerSec));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [capacity, refillPerSec]);

  const pct = Math.max(0, Math.min(100, (tokens / capacity) * 100));
  const empty = tokens < 1;

  return (
    <div className="gauge-wrap">
      <div className={`gauge${empty ? ' empty' : ''}`}>
        <div className="fill" style={{ height: `${pct}%` }} />
      </div>
      <div className="gauge-meta">
        <div className="big">{Math.floor(tokens)}</div>
        <div className="sub">/ {capacity} tokens</div>
        <div className="sub" style={{ marginTop: 10 }}>
          +{refillPerSec}/s refill
        </div>
      </div>
    </div>
  );
}
