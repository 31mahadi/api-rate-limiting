'use client';

import { useEffect, useState } from 'react';
import type { RateLimitConfig } from '@repo/shared';
import { API_URL, getSessionId, sessionKey } from '../lib/api';
import { useRateLimitStream } from '../lib/use-rate-limit-stream';
import { useTraffic } from '../lib/use-traffic';
import { TrafficControl } from './TrafficControl';
import { TokenBucketGauge } from './TokenBucketGauge';
import { RequestStream } from './RequestStream';
import { ThroughputChart } from './ThroughputChart';

const DEFAULT_CONFIG: RateLimitConfig = { capacity: 10, refillPerSec: 5 };

export function Dashboard() {
  const [config, setConfig] = useState<RateLimitConfig>(DEFAULT_CONFIG);
  const [sessionId, setSessionId] = useState('');
  const [rate, setRate] = useState(8);
  const [running, setRunning] = useState(false);

  useEffect(() => setSessionId(getSessionId()), []);
  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then((r) => r.json())
      .then((c: RateLimitConfig) => setConfig(c))
      .catch(() => setConfig(DEFAULT_CONFIG));
  }, []);

  const key = sessionId ? sessionKey(sessionId) : '__none__';
  const { events, latest, connected } = useRateLimitStream(key);
  useTraffic(running && Boolean(sessionId), rate, sessionId);

  const served = events.filter((e) => e.allowed).length;
  const throttled = events.length - served;
  const remaining = latest ? latest.remaining : config.capacity;
  const since = latest ? latest.ts : Date.now();
  const lastStatus = latest ? (latest.allowed ? '200' : '429') : '—';

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Distributed Rate Limiter — Live</h1>
        <p>
          A Redis token-bucket limiter in NestJS. Drive traffic with the slider and watch the bucket
          drain and requests flip to <strong>429</strong> the instant you cross the sustained rate.
        </p>
        <div className={`conn${connected ? ' live' : ''}`}>
          <span className="dot" />
          {connected ? 'streaming /api/events' : 'disconnected'}
        </div>
      </header>

      <div className="stats" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="label">Tokens left</div>
          <div className={`value ${remaining < 1 ? 'red' : 'green'}`}>
            {Math.floor(remaining)}
          </div>
        </div>
        <div className="stat">
          <div className="label">Served (200)</div>
          <div className="value green">{served}</div>
        </div>
        <div className="stat">
          <div className="label">Throttled (429)</div>
          <div className="value red">{throttled}</div>
        </div>
        <div className="stat">
          <div className="label">Last status</div>
          <div className={`value ${lastStatus === '429' ? 'red' : lastStatus === '200' ? 'green' : ''}`}>
            {lastStatus}
          </div>
        </div>
      </div>

      <div className="grid">
        <TrafficControl
          rate={rate}
          running={running}
          refillPerSec={config.refillPerSec}
          onRateChange={setRate}
          onToggle={() => setRunning((r) => !r)}
        />

        <div className="col">
          <div className="row">
            <div className="panel" style={{ flex: '0 0 auto' }}>
              <h2>Token bucket</h2>
              <TokenBucketGauge
                capacity={config.capacity}
                refillPerSec={config.refillPerSec}
                remaining={remaining}
                since={since}
              />
            </div>
            <div className="panel" style={{ flex: 1 }}>
              <h2>Request stream</h2>
              <RequestStream events={events} />
            </div>
          </div>

          <div className="panel">
            <h2>Throughput (last 30s)</h2>
            <ThroughputChart events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
