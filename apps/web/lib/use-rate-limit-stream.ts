'use client';

import { useEffect, useRef, useState } from 'react';
import type { RateLimitEvent } from '@repo/shared';
import { API_URL } from './api';

export interface StreamState {
  events: RateLimitEvent[];
  latest: RateLimitEvent | null;
  connected: boolean;
}

export function useRateLimitStream(filterKey: string, max = 90): StreamState {
  const [events, setEvents] = useState<RateLimitEvent[]>([]);
  const [latest, setLatest] = useState<RateLimitEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const filterRef = useRef(filterKey);
  filterRef.current = filterKey;

  useEffect(() => {
    const source = new EventSource(`${API_URL}/api/events`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as RateLimitEvent;
      if (event.key !== filterRef.current) return;
      setLatest(event);
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > max ? next.slice(next.length - max) : next;
      });
    };

    return () => source.close();
  }, [max]);

  return { events, latest, connected };
}
