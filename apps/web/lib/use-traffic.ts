'use client';

import { useEffect, useRef } from 'react';
import { SESSION_HEADER } from '@repo/shared';
import { API_URL } from './api';

/**
 * Fires requests at `rate` req/s against the limited endpoint while `running`.
 * An AbortController cancels in-flight requests on stop so nothing leaks.
 * The visualization is driven by the server's SSE events, not these responses,
 * so we deliberately ignore the result here.
 */
export function useTraffic(running: boolean, rate: number, sessionId: string): void {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running || rate <= 0) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    const intervalMs = Math.max(10, 1000 / rate);

    const timer = setInterval(() => {
      void fetch(`${API_URL}/api/work`, {
        headers: { [SESSION_HEADER]: sessionId },
        signal: controller.signal,
      }).catch(() => {
        /* aborted or network blip — ignored on purpose */
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [running, rate, sessionId]);
}
