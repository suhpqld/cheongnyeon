import { z } from 'zod';
import { getDb, toCamel } from '@/lib/server/db';
import { requireApp } from '@/lib/server/auth';
import { fail, ok, withErrors } from '@/lib/server/http';
import { normalizeDistrict, validateAnswer } from '@/lib/rules/form';
import { discoverNewItems } from '@/lib/rules/discovery';
import { PROGRAM_CODE } from '@/lib/constants';
import type { Answer, AnswerMap, FormField } from '@/lib/types';
import type { DocumentRule } from '@/lib/rules/checklist';
import type { PrecheckRule } from '@/lib/types';

const answerSchema = z.object({
  fieldKey: z.string().min(1),
  value: z.union([z.boolean(), z.number(), z.string(), z.array(z.record(z.string(), z.unknown()))]),
  rawSpeech: z.string().nullable().optional(),
  inputMethod: z.enum(['voice', 'button', 'text', 'unknown']),
  isApproximate: z.boolean().optional(),
});
const requestSchema = z.object({ answers: z.array(answerSchema).min(1) });

async function loadFields(appId: string): Promise<FormField[]> {
  const { data, error } = await getDb().from('application').select('program_id').eq('id', appId).single();
  if (error) throw error;
  let programId = data.program_id;
  if (!programId) {
    const program = await getDb().from('welfare_program').select('id').eq('code', PROGRAM_CODE).single();
    if (program.error) throw program.error;
    programId = program.data.id;
  }
  const fields = await getDb().from('form_field').select('*').eq('program_id', programId).order('sort_order', { ascending: true });
  if (fields.error) throw fields.error;
  return (fields.data ?? []).map((row) => toCamel<FormField>(row));
}

async function loadProgramId(appId: string): Promise<string> {
  const { data, error } = await getDb().from('application').select('program_id').eq('id', appId).single();
  if (error) throw error;
  if (data.program_id) return data.program_id;
  const program = await getDb().from('welfare_program').select('id').eq('code', PROGRAM_CODE).single();
  if (program.error) throw program.error;
  return program.data.id;
}

async function loadDiscoveryRules(programId: string): Promise<{ documentRules: DocumentRule[]; precheckRules: PrecheckRule[] }> {
  const db = getDb();
  const [documents, prechecks] = await Promise.all([
    db.from('document_rule').select('*').eq('program_id', programId).order('sort_order', { ascending: true }),
    db.from('precheck_rule').select('*').eq('program_id', programId).order('sort_order', { ascending: true }),
  ]);
  if (documents.error) throw documents.error;
  if (prechecks.error) throw prechecks.error;
  return {
    documentRules: (documents.data ?? []).map((row) => toCamel<DocumentRule>(row)),
    precheckRules: (prechecks.data ?? []).map((row) => toCamel<PrecheckRule>(row)),
  };
}

async function loadAnswers(appId: string, fields: FormField[]): Promise<AnswerMap> {
  const { data, error } = await getDb().from('answer').select('field_id, value, raw_speech, input_method, is_approximate').eq('application_id', appId);
  if (error) throw error;
  const keys = new Map(fields.map((field) => [field.id, field.key]));
  return Object.fromEntries((data ?? []).flatMap((row) => {
    const fieldKey = keys.get(row.field_id);
    return fieldKey ? [[fieldKey, {
      fieldKey,
      value: row.value as Answer['value'],
      rawSpeech: row.raw_speech,
      inputMethod: row.input_method as Answer['inputMethod'],
      isApproximate: row.is_approximate,
    } satisfies Answer]] : [];
  }));
}

export const PUT = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireApp(request, id);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'invalid', '답을 다시 확인해 주세요.');

  const fields = await loadFields(id);
  const beforeAnswers = await loadAnswers(id, fields);
  const rules = await loadDiscoveryRules(await loadProgramId(id));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const invalid: string[] = [];
  const rows: Record<string, unknown>[] = [];
  const afterAnswers: AnswerMap = { ...beforeAnswers };
  for (const answer of parsed.data.answers) {
    const field = byKey.get(answer.fieldKey);
    if (!field) { invalid.push(answer.fieldKey); continue; }
    const value = field.type === 'district' && typeof answer.value === 'string'
      ? normalizeDistrict(answer.value)
      : answer.value;
    if (!validateAnswer(field, value)) { invalid.push(answer.fieldKey); continue; }
    afterAnswers[answer.fieldKey] = {
      fieldKey: answer.fieldKey,
      value,
      rawSpeech: answer.rawSpeech ?? null,
      inputMethod: answer.inputMethod,
      isApproximate: answer.isApproximate ?? false,
    };
    rows.push({
      application_id: id,
      field_id: field.id,
      value,
      raw_speech: answer.rawSpeech ?? null,
      input_method: answer.inputMethod,
      is_approximate: answer.isApproximate ?? false,
      updated_at: new Date().toISOString(),
    });
  }
  if (rows.length) {
    const { error } = await getDb().from('answer').upsert(rows, { onConflict: 'application_id,field_id' });
    if (error) throw error;
    const { error: appError } = await getDb().from('application').update({ updated_at: new Date().toISOString() }).eq('id', id);
    if (appError) throw appError;
  }
  if (invalid.length) return fail(400, 'invalid', '답을 다시 확인해 주세요.');
  const discovery = discoverNewItems(fields, beforeAnswers, afterAnswers, rules.documentRules, rules.precheckRules);
  return ok({ answers: await loadAnswers(id, fields), ...discovery });
});
