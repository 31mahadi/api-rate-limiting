import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// Demonstrates the limit: at 25 req/s against a 5/s refill (capacity 10),
// the first burst is served, then ~5/s get through and the rest are throttled.
const allowed = new Counter('rl_allowed');
const throttled = new Counter('rl_throttled');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SESSION = __ENV.SESSION || 'k6-sim';

export const options = {
  scenarios: {
    over_limit: {
      executor: 'constant-arrival-rate',
      rate: 25,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 30,
      maxVUs: 60,
    },
  },
  thresholds: {
    // The whole point: throttling MUST engage when arrival > refill.
    rl_throttled: ['count>0'],
    rl_allowed: ['count>0'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/work`, {
    headers: { 'x-demo-session': SESSION },
  });
  if (res.status === 200) allowed.add(1);
  else if (res.status === 429) throttled.add(1);
  check(res, { 'is 200 or 429': (r) => r.status === 200 || r.status === 429 });
}

export function handleSummary(data) {
  const a = data.metrics.rl_allowed?.values.count ?? 0;
  const t = data.metrics.rl_throttled?.values.count ?? 0;
  const total = a + t || 1;
  const servedPerSec = (a / 20).toFixed(1);
  return {
    stdout:
      `\n=== Rate-limit simulation (25 req/s vs 5/s refill, capacity 10) ===\n` +
      `  served   (200): ${a}  (~${servedPerSec}/s — should track the refill rate)\n` +
      `  throttled(429): ${t}  (${((t / total) * 100).toFixed(0)}% of requests)\n` +
      `  => limiter ${t > 0 ? 'ENGAGED ✅' : 'did NOT engage ❌'}\n\n`,
  };
}
