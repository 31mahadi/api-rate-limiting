import { consume, BucketState } from './token-bucket';

const params = { capacity: 10, refillPerSec: 5 };

describe('token-bucket consume()', () => {
  it('starts full and allows a burst up to capacity', () => {
    let state: BucketState | null = null;
    const now = 1_000;
    for (let i = 0; i < 10; i++) {
      const r = consume(now, state, params);
      expect(r.allowed).toBe(true);
      state = r.state;
    }
    expect(state?.tokens).toBeCloseTo(0);
  });

  it('rejects once the bucket is empty (same instant)', () => {
    let state: BucketState | null = null;
    const now = 1_000;
    for (let i = 0; i < 10; i++) state = consume(now, state, params).state;

    const blocked = consume(now, state, params);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBeCloseTo(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills over time at refillPerSec', () => {
    // Drain fully at t=0
    let state: BucketState | null = null;
    for (let i = 0; i < 10; i++) state = consume(0, state, params).state;

    // 1s later -> 5 tokens back -> exactly 5 allowed, 6th blocked
    let t = 1_000;
    for (let i = 0; i < 5; i++) {
      const r = consume(t, state, params);
      expect(r.allowed).toBe(true);
      state = r.state;
    }
    expect(consume(t, state, params).allowed).toBe(false);
  });

  it('never exceeds capacity even after a long idle period', () => {
    const old: BucketState = { tokens: 0, ts: 0 };
    const r = consume(10_000_000, old, params);
    expect(r.remaining).toBeLessThanOrEqual(params.capacity);
  });

  it('computes a sane retryAfterMs when blocked', () => {
    const empty: BucketState = { tokens: 0, ts: 1_000 };
    const r = consume(1_000, empty, params);
    // need 1 token at 5/s => ~200ms
    expect(r.retryAfterMs).toBe(200);
  });

  it('honors a custom cost', () => {
    const r = consume(0, { tokens: 3, ts: 0 }, { ...params, cost: 5 });
    expect(r.allowed).toBe(false);
  });
});
