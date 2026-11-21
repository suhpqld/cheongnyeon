import { SHARE_DAYS } from '@/lib/constants';
import { newShareCode, requireApp } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';

type Context = { params: Promise<{ id: string }> };

function linkResponse(request: Request, code: string, expiresAt: string) {
  return ok({ shareUrl: new URL('/s/' + encodeURIComponent(code), request.url).href, expiresAt });
}

export const POST = withErrors(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const now = Date.now();
  const appExpiry = Date.parse(row.expires_at);
  if (appExpiry <= now) return fail(404, 'app', '기간이 지난 신청이에요.');
  if (row.share_code && row.share_expires_at && Date.parse(row.share_expires_at) > now) {
    return linkResponse(request, row.share_code, row.share_expires_at);
  }

  const db = getDb();
  const expiresAt = new Date(Math.min(appExpiry, now + SHARE_DAYS * 86_400_000)).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newShareCode();
    const update = db.from('application').update({ share_code: code, share_expires_at: expiresAt })
      .eq('id', id).eq('app_token', row.app_token);
    const matching = row.share_code ? update.eq('share_code', row.share_code) : update.is('share_code', null);
    const guarded = row.share_expires_at
      ? matching.eq('share_expires_at', row.share_expires_at)
      : matching.is('share_expires_at', null);
    const { data, error } = await guarded.select('share_code').maybeSingle();
    if (error?.code === '23505') continue;
    if (error) throw error;
    if (data) return linkResponse(request, code, expiresAt);

    const current = await requireApp(request, id);
    if (current.share_code && current.share_expires_at && Date.parse(current.share_expires_at) > Date.now()) {
      return linkResponse(request, current.share_code, current.share_expires_at);
    }
    return fail(409, 'share_changed', '공유 상태가 바뀌었어요. 다시 열어 주세요.');
  }
  return fail(503, 'share', '링크를 만들지 못했어요. 잠시 뒤 다시 해 주세요.');
});

export const DELETE = withErrors(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const { error } = await getDb().from('application').update({ share_code: null, share_expires_at: null })
    .eq('id', id).eq('app_token', row.app_token);
  if (error) throw error;
  return ok({ ok: true });
});
