import { getSession } from './session';

export class ApiError extends Error {
  constructor(public status: number, public error: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new TypeError('Expected a same-origin API URL');
  const headers = new Headers();
  const session = getSession();
  if (session) headers.set('x-app-token', session.token);
  if (init.body !== undefined) headers.set('content-type', 'application/json');

  const response = await fetch(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'server', data?.message ?? '잠시 뒤 다시 시도해 주세요.');
  }
  return data as T;
}
