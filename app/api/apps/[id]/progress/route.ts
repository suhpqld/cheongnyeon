import { buildProgress } from '@/lib/rules/progress';
import { publicApp, requireApp } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { Answer, AnswerMap, FormField, PrecheckResult, PrecheckRule } from '@/lib/types';

export const GET = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  if (Date.parse(row.expires_at) <= Date.now()) {
    return fail(404, 'app', '기간이 지난 신청이에요.');
  }

  const db = getDb();
  const programId = row.program_id ?? '';
  const [program, fields, answers, checklist, rules, results, latest] = await Promise.all([
    row.program_id ? db.from('welfare_program').select('name').eq('id', programId).maybeSingle() : null,
    row.program_id ? db.from('form_field').select('*').eq('program_id', programId) : null,
    db.from('answer').select('field_id, value, is_approximate').eq('application_id', id),
    db.from('checklist_item').select('doc_name, is_done, supplement_id')
      .eq('application_id', id).order('created_at').order('id'),
    row.program_id ? db.from('precheck_rule').select('id, condition').eq('program_id', programId) : null,
    db.from('precheck_result').select('rule_id, result').eq('application_id', id),
    db.from('supplement_request').select('id,deadline,deadline_confirmed,parsed_json')
      .eq('application_id', id).is('submitted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  for (const result of [program, fields, answers, checklist, rules, results, latest]) {
    if (result?.error) throw result.error;
  }

  const formFields = (fields?.data ?? []).map(field => toCamel<FormField>(field));
  const fieldKeys = new Map(formFields.map(field => [field.id, field.key]));
  const answerMap: AnswerMap = Object.fromEntries((answers.data ?? []).flatMap(answer => {
    const fieldKey = fieldKeys.get(answer.field_id);
    const { value } = answer;
    if (!fieldKey || !(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value))) return [];
    const entry: Answer = { fieldKey, value, rawSpeech: null, inputMethod: 'unknown', isApproximate: answer.is_approximate };
    return [[fieldKey, entry]];
  }));
  const precheckResults: Record<string, PrecheckResult> = Object.fromEntries(
    (results.data ?? []).map(result => [result.rule_id, result.result]),
  );
  const items = checklist.data ?? [];
  const supplement = latest.data;
  const supplementChecklistCount = supplement ? items.filter(item => item.supplement_id === supplement.id).length : 0;
  const parsedItems = supplement?.parsed_json?.items;

  return ok(buildProgress({
    app: publicApp(row),
    programName: program?.data?.name ?? '복지 신청',
    fields: formFields,
    answers: answerMap,
    checklist: items.map(item => ({ docName: item.doc_name, isDone: item.is_done })),
    precheckRules: (rules?.data ?? []).map(rule => toCamel<Pick<PrecheckRule, 'id' | 'condition'>>(rule)),
    precheckResults,
    supplement: supplement ? {
      id: supplement.id,
      deadline: supplement.deadline,
      deadlineConfirmed: supplement.deadline_confirmed,
      itemCount: supplementChecklistCount || (Array.isArray(parsedItems) ? parsedItems.length : 0),
    } : null,
  }));
});
