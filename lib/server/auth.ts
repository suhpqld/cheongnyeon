import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { RESUME_CODE_LENGTH } from '../constants';
import type { Application, AppStatus, HelperMode } from '../types';
import { getDb } from './db';
import { fail } from './http';

export interface AppRow {
  id: string;
  program_id: string | null;
  status: AppStatus;
  helper_mode: HelperMode;
  resume_code: string;
  app_token: string;
  share_code: string | null;
  share_expires_at: string | null;
  submitted_at: string | null;
  ai_call_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export function newToken(): string {
  return randomBytes(24).toString('base64url');
}

export function newResumeCode(): string {
  return String(randomInt(10 ** RESUME_CODE_LENGTH)).padStart(RESUME_CODE_LENGTH, '0');
}

export function newShareCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

export async function requireApp(req: Request, appId: string): Promise<AppRow> {
  const token = req.headers.get('x-app-token');
  const invalid = () => fail(401, 'token', '다시 이어서 하기 번호를 넣어 주세요.');
  if (!token) throw invalid();
  const { data, error } = await getDb().from('application').select('*').eq('id', appId).maybeSingle();
  if (error && error.code !== '22P02') throw error;
  if (!data) throw fail(404, 'app', '신청 내용을 찾을 수 없어요.');
  const row = data as AppRow;
  const expected = Buffer.from(row.app_token);
  const actual = Buffer.from(token);
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw invalid();
  return row;
}

export function publicApp(row: AppRow): Application {
  return {
    id: row.id,
    programId: row.program_id,
    status: row.status,
    helperMode: row.helper_mode,
    resumeCode: row.resume_code,
    submittedAt: row.submitted_at,
    shareActive: Boolean(row.share_code && row.share_expires_at && Date.parse(row.share_expires_at) > Date.now()),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
