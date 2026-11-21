import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fail } from './http';

let db: SupabaseClient | undefined;

export function getDb(): SupabaseClient {
  if (db) return db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw fail(500, 'config', '서버 설정이 아직 안 됐어요.');
  db = createClient(url, key, { auth: { persistSession: false } });
  return db;
}

export function toCamel<T>(row: object): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()), value]),
  ) as T;
}

export function toSnake(obj: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.replace(/[A-Z]/g, char => '_' + char.toLowerCase()), value]),
  );
}
