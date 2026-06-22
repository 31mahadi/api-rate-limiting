export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const SESSION_STORAGE_KEY = 'rl-demo-session';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}
