import { STORAGE_KEYS } from '../constants';
import type { Session } from '../types';

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (typeof session?.appId === 'string' && typeof session.token === 'string' &&
        typeof session.resumeCode === 'string') return session;
  } catch {
    return null;
  }
  return null;
}

export function saveSession(session: Session): void {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEYS.session);
}
