/** Base URL of the API. Inlined at build time for client components. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const SESSION_STORAGE_KEY = 'rl-demo-session';

/** A stable per-browser id so each visitor drives their own isolated bucket. */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

/** The bucket key the API emits for this session (must match the guard). */
export function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}
