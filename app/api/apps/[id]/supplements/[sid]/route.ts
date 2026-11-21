import { z } from 'zod';
import { validDate } from '@/lib/ai/supplement-schema';
import { ALLOWED_STATUS_CHANGES } from '@/lib/constants';
import { requireApp } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { ChecklistItem, Supplement } from '@/lib/types';

type Context = { params: Promise<{ id: string; sid: string }> };

async function findSupplement(id: string, sid: string) {
  const { data, error } = await getDb().from('supplement_request').select('*')
    .eq('id', sid).eq('application_id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw fail(404, 'supplement', '추가 서류를 찾을 수 없어요.');
  return data;
}

function publicSupplement(row: Record<string, unknown>): Supplement {
  return {
    id: row.id as string,
    parsed: row.parsed_json as Supplement['parsed'],
    deadline: row.deadline as string | null,
    deadlineConfirmed: row.deadline_confirmed as boolean,
    submittedAt: row.submitted_at as string | null,
    createdAt: row.created_at as string,
  };
}

export const GET = withErrors(async (request: Request, { params }: Context) => {
  const { id, sid } = await params;
  await requireApp(request, id);
  const row = await findSupplement(id, sid);
  const { data: items, error } = await getDb().from('checklist_item').select('*')
    .eq('application_id', id).eq('supplement_id', sid);
  if (error) throw error;
  return ok({ supplement: publicSupplement(row), items: (items ?? []).map(item => toCamel<ChecklistItem>(item)) });
});

const patchSchema = z.object({
  deadline: z.string().optional(),
  deadlineConfirmed: z.literal(true).optional(),
  submitted: z.literal(true).optional(),
}).refine(value => Object.keys(value).length > 0);

export const PATCH = withErrors(async (request: Request, { params }: Context) => {
  const { id, sid } = await params;
  const app = await requireApp(request, id);
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || (body.data.deadline && !validDate(body.data.deadline))) {
    return fail(400, 'invalid', '날짜를 확인해 주세요.');
  }
  const row = await findSupplement(id, sid);
  const { deadline, deadlineConfirmed, submitted } = body.data;
  if (submitted && !row.deadline_confirmed && !deadlineConfirmed) {
    return fail(409, 'deadline', '먼저 제출 날짜를 확인해 주세요.');
  }
  if (submitted && app.status !== 'submitted' && !ALLOWED_STATUS_CHANGES[app.status].includes('submitted')) {
    return fail(409, 'status', '지금은 제출 완료로 바꿀 수 없어요.');
  }
  const db = getDb();
  const now = new Date().toISOString();
  const { data: updated, error } = await db.from('supplement_request').update({
    ...(deadline !== undefined ? { deadline } : {}),
    ...(deadlineConfirmed ? { deadline_confirmed: true } : {}),
    ...(submitted ? { submitted_at: now } : {}),
  }).eq('id', sid).eq('application_id', id).select('*').single();
  if (error) throw error;
  if (deadline !== undefined) {
    const { error: dueError } = await db.from('checklist_item').update({ due_date: deadline })
      .eq('application_id', id).eq('supplement_id', sid);
    if (dueError) throw dueError;
  }
  if (submitted && app.status !== 'submitted') {
    const { error: statusError } = await db.from('application').update({ status: 'submitted', submitted_at: now, updated_at: now })
      .eq('id', id).eq('status', app.status);
    if (statusError) throw statusError;
  }
  return ok({ supplement: publicSupplement(updated) });
});
