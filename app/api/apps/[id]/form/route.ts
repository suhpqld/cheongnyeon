import { PROGRAM_CODE } from '@/lib/constants';
import { requireApp } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import type { Answer, AnswerMap, FormField, Program } from '@/lib/types';
import { ok, withErrors } from '@/lib/server/http';

export const GET = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const app = await requireApp(request, id);
  const db = getDb();

  const programQuery = app.program_id
    ? db.from('welfare_program').select('id, code, name, summary_easy, apply_place, contact, after_submit_easy').eq('id', app.program_id).maybeSingle()
    : db.from('welfare_program').select('id, code, name, summary_easy, apply_place, contact, after_submit_easy').eq('code', PROGRAM_CODE).maybeSingle();
  const { data: programRow, error: programError } = await programQuery;
  if (programError) throw programError;
  if (!programRow) return ok({ program: null, fields: [], answers: {} });
  const [{ data: fieldRows, error: fieldError }, { data: answerRows, error: answerError }] = await Promise.all([
    db.from('form_field').select('*').eq('program_id', programRow.id).order('sort_order', { ascending: true }),
    db.from('answer').select('field_id, value, raw_speech, input_method, is_approximate').eq('application_id', id),
  ]);
  if (fieldError) throw fieldError;
  if (answerError) throw answerError;

  const program = programRow ? toCamel<Program>(programRow) : null;
  const fields = (fieldRows ?? []).map((row) => toCamel<FormField>(row));
  const fieldKeys = new Map(fields.map((field) => [field.id, field.key]));
  const answers: AnswerMap = {};
  for (const row of answerRows ?? []) {
    const fieldKey = fieldKeys.get(row.field_id);
    if (!fieldKey) continue;
    answers[fieldKey] = {
      fieldKey,
      value: row.value as Answer['value'],
      rawSpeech: row.raw_speech,
      inputMethod: row.input_method as Answer['inputMethod'],
      isApproximate: row.is_approximate,
    };
  }
  return ok({ program, fields, answers });
});
