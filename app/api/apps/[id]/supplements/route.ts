import { z } from 'zod';
import { supplementParsedSchema, validDate } from '@/lib/ai/supplement-schema';
import { ALLOWED_STATUS_CHANGES } from '@/lib/constants';
import { mergeSupplement } from '@/lib/rules/supplement';
import { requireApp } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { ChecklistItem } from '@/lib/types';

const bodySchema = z.object({
  parsed: supplementParsedSchema,
  sourceText: z.string().max(20_000).optional(),
});

export const POST = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const app = await requireApp(request, id);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !body.data.parsed.items.length) return fail(400, 'invalid', '추가 서류 내용을 확인해 주세요.');
  if (app.status !== 'supplementing' && !ALLOWED_STATUS_CHANGES[app.status].includes('supplementing')) {
    return fail(409, 'status', '지금은 추가 서류를 저장할 수 없어요.');
  }
  const db = getDb();
  const parsed = body.data.parsed;
  const deadline = validDate(parsed.deadline) ? parsed.deadline : null;
  const { data: saved, error: saveError } = await db.from('supplement_request').insert({
    application_id: id,
    source_text: body.data.sourceText ?? null,
    parsed_json: { ...parsed, deadline },
    deadline,
    deadline_confirmed: false,
    office_contact: parsed.officeContact,
  }).select('id').single();
  if (saveError) throw saveError;
  const sid = saved.id as string;
  const { data: rows, error: listError } = await db.from('checklist_item').select('*').eq('application_id', id);
  if (listError) throw listError;
  const existing = (rows ?? []).map(row => toCamel<ChecklistItem>(row));
  const merged = mergeSupplement(existing, parsed.items, deadline, sid);
  for (const item of merged.updated) {
    const before = existing.find(row => row.id === item.id)!;
    if (before.supplementId !== item.supplementId || before.dueDate !== item.dueDate || before.isDone !== item.isDone || before.alsoRequested !== item.alsoRequested) {
      const { error } = await db.from('checklist_item').update({
        supplement_id: item.supplementId, due_date: item.dueDate,
        is_done: item.isDone, also_requested: item.alsoRequested,
      }).eq('id', item.id).eq('application_id', id);
      if (error) throw error;
    }
  }
  if (merged.added.length) {
    const { error } = await db.from('checklist_item').insert(merged.added.map(item => ({
      application_id: id, supplement_id: sid, doc_name: item.docName,
      easy_explain: item.easyExplain, issue_place: item.issuePlace,
      place_group: item.placeGroup, source: item.source, due_date: item.dueDate,
      is_done: false, also_requested: false,
    })));
    if (error) throw error;
  }
  if (app.status !== 'supplementing') {
    const { error } = await db.from('application').update({ status: 'supplementing', updated_at: new Date().toISOString() })
      .eq('id', id).eq('status', app.status);
    if (error) throw error;
  }
  return ok({ supplementId: sid, addedCount: merged.addedCount, matchedCount: merged.matchedCount }, 201);
});
