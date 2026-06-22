'use client';

import { useEffect } from 'react';
import { SESSION_HEADER } from '@repo/shared';
import { API_URL } from './api';

// Fires requests at `rate` req/s while running; the dashboard is driven by the
// server's SSE events, so the responses here are intentionally ignored.
export function useTraffic(running: boolean, rate: number, sessionId: string): void {
  useEffect(() => {
    if (!running || rate <= 0) return;

    const controller = new AbortController();
    const intervalMs = Math.max(10, 1000 / rate);

    const timer = setInterval(() => {
      void fetch(`${API_URL}/api/work`, {
        headers: { [SESSION_HEADER]: sessionId },
        signal: controller.signal,
      }).catch(() => {});
    }, intervalMs);

    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [running, rate, sessionId]);
}
