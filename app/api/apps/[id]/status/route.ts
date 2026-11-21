import { z } from 'zod';
import { ALLOWED_STATUS_CHANGES } from '@/lib/constants';
import { publicApp, requireApp, type AppRow } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';

const requestBody = z.object({ status: z.enum(['drafting', 'preparing', 'submitted', 'supplementing']) });

export const PATCH = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  let row = await requireApp(request, id);
  const body = requestBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, 'invalid', '바꿀 단계를 확인해 주세요.');
  const { status } = body.data;

  for (;;) {
    if (row.status === status) return ok({ app: publicApp(row) });
    if (!ALLOWED_STATUS_CHANGES[row.status].includes(status)) {
      return fail(409, 'status', '지금은 그 단계로 갈 수 없어요.');
    }
    const now = new Date().toISOString();
    const changes = { status, updated_at: now, ...(status === 'submitted' ? { submitted_at: now } : {}) };
    const { data, error } = await getDb().from('application').update(changes)
      .eq('id', id).eq('app_token', row.app_token).eq('status', row.status).select('*').maybeSingle();
    if (error) throw error;
    if (data) return ok({ app: publicApp(data as AppRow) });
    row = await requireApp(request, id);
  }
});
