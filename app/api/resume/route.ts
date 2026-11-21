import { isIP } from 'node:net';
import { z } from 'zod';
import { RESUME_CODE_LENGTH, RESUME_LOCK_MINUTES, RESUME_MAX_FAILS } from '@/lib/constants';
import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';

const requestBody = z.object({ code: z.string().max(64) });
const windowMs = RESUME_LOCK_MINUTES * 60_000;

function clientIp(request: Request): string {
  const name = process.env.VERCEL === '1' ? 'x-vercel-forwarded-for' : 'x-forwarded-for';
  const ip = request.headers.get(name)?.split(',')[0]?.trim() ?? '';
  const version = isIP(ip);
  if (version === 6 && !ip.includes('%')) return new URL('http://[' + ip + ']').hostname;
  return version === 4 ? ip : 'unknown';
}

async function attemptsSince(ip: string, now: number) {
  const { data, error } = await getDb().from('resume_attempt').select('id, created_at')
    .eq('ip', ip).eq('success', false).gte('created_at', new Date(now - windowMs * 2).toISOString())
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map(row => ({ id: row.id as string, time: Date.parse(row.created_at) }));
}

function lockUntil(attempts: Array<{ time: number }>, now: number) {
  for (let index = 0; index + RESUME_MAX_FAILS <= attempts.length; index++) {
    const latest = attempts[index].time;
    const earliest = attempts[index + RESUME_MAX_FAILS - 1].time;
    if (latest + windowMs <= now) break;
    if (latest - earliest <= windowMs) return latest + windowMs;
  }
  return 0;
}

function locked(retryAfterSeconds: number) {
  const response = ok({
    error: 'locked',
    message: '번호를 여러 번 틀렸어요. 잠시 뒤 다시 해 주세요.',
    retryAfterSeconds,
  }, 429);
  response.headers.set('Retry-After', String(retryAfterSeconds));
  return response;
}

export const POST = withErrors(async (request: Request) => {
  const body = requestBody.safeParse(await request.json().catch(() => null));
  const code = body.success ? body.data.code.normalize('NFKC').replace(/\D/g, '') : '';
  if (code.length !== RESUME_CODE_LENGTH) return fail(400, 'format', '번호 8자리를 눌러 주세요.');

  const ip = clientIp(request);
  const now = Date.now();
  const initialLock = lockUntil(await attemptsSince(ip, now), now);
  if (initialLock) return locked(Math.ceil((initialLock - now) / 1000));

  const db = getDb();
  // Reserve a try in the database before looking up the code. Parallel requests count each other's reservations.
  const reservation = await db.from('resume_attempt').insert({ ip, success: false }).select('id').single();
  if (reservation.error) throw reservation.error;
  const attemptId = reservation.data.id;
  let recorded = false;
  try {
    const checkTime = Date.now();
    const attempts = await attemptsSince(ip, checkTime);
    const concurrentLock = lockUntil(attempts.filter(attempt => attempt.id !== attemptId), checkTime);
    const currentTries = attempts.filter(attempt => attempt.time > checkTime - windowMs).length;
    if (concurrentLock || currentTries > RESUME_MAX_FAILS) {
      return locked(concurrentLock ? Math.ceil((concurrentLock - checkTime) / 1000) : RESUME_LOCK_MINUTES * 60);
    }

    const { data, error } = await db.from('application').select('id, app_token, resume_code')
      .eq('resume_code', code).gt('expires_at', new Date(checkTime).toISOString()).maybeSingle();
    if (error) throw error;
    if (!data) {
      recorded = true;
      return ok({
        error: 'notfound',
        message: '그 번호가 없어요. 다시 확인해 주세요.',
        remaining: Math.max(0, RESUME_MAX_FAILS - currentTries),
      }, 404);
    }

    const updated = await db.from('resume_attempt').update({ success: true }).eq('id', attemptId);
    if (updated.error) throw updated.error;
    recorded = true;
    return ok({ appId: data.id, token: data.app_token, resumeCode: data.resume_code });
  } finally {
    if (!recorded) await db.from('resume_attempt').delete().eq('id', attemptId);
  }
});
