import { z } from 'zod';
import { PROGRAM_CODE } from '@/lib/constants';
import { requireApp, type AppRow } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import { loadForm, loadPrecheck, visibleAnswerMap } from '../card/load';

type Ctx = { params: Promise<{ id: string }> };

async function programId(row: AppRow): Promise<string> {
  if (row.program_id) return row.program_id;
  const { data, error } = await getDb().from('welfare_program').select('id').eq('code', PROGRAM_CODE).maybeSingle();
  if (error) throw error;
  if (!data) throw fail(404, 'program', '제도 정보를 찾을 수 없어요.');
  return data.id as string;
}

// 🔒 GET /api/apps/[id]/precheck → { rules, results }  (해당되는 점검만, sortOrder 순)
export const GET = withErrors(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const pid = await programId(row);
  const { fields, answers } = await loadForm(row, pid);
  const { shown } = visibleAnswerMap(fields, answers);
  return ok(await loadPrecheck(row, pid, shown));
});

const requestBody = z.object({
  ruleId: z.string().min(1),
  result: z.enum(['yes', 'no', 'unknown']),
});

// 🔒 PUT /api/apps/[id]/precheck  { ruleId, result } → { ok: true }
export const PUT = withErrors(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const body = requestBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, 'invalid', '답을 다시 눌러 주세요.');

  const db = getDb();
  const pid = await programId(row);
  const rule = await db
    .from('precheck_rule')
    .select('id')
    .eq('id', body.data.ruleId)
    .eq('program_id', pid)
    .maybeSingle();
  if (rule.error && rule.error.code !== '22P02') throw rule.error;
  if (!rule.data) return fail(404, 'rule', '점검 질문을 찾을 수 없어요.');

  const { error } = await db.from('precheck_result').upsert(
    {
      application_id: row.id,
      rule_id: body.data.ruleId,
      result: body.data.result,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'application_id,rule_id' },
  );
  if (error) throw error;
  return ok({ ok: true });
});
