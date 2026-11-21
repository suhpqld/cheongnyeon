// 04 서버 전용: 카드, 점검, 출력이 같이 쓰는 데이터 읽기
import 'server-only';
import { PROGRAM_CODE } from '@/lib/constants';
import { displayAnswer } from '@/lib/format';
import { matches, visibleFields } from '@/lib/rules/condition';
import {
  buildAnswerLines,
  buildCheckTasks,
  isDocsReady,
  placeFromAnswers,
  rebuildBaseChecklist,
  sortChecklist,
  type CheckTask,
  type DocumentRule,
} from '@/lib/rules/checklist';
import { applicablePrechecks, pendingPrechecks } from '@/lib/rules/precheck';
import { publicApp, type AppRow } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail } from '@/lib/server/http';
import type {
  Answer,
  AnswerMap,
  Application,
  CardScriptRequest,
  ChecklistItem,
  FormField,
  PrecheckResult,
  PrecheckRule,
} from '@/lib/types';
import { buildPrintSections, type PrintSection } from '@/components/card/PrintSheet';

export interface CardData {
  app: Application;
  programName: string;
  place: { district: string | null; dong: string | null };
  checklist: ChecklistItem[];
  docsReady: boolean;
  checkTasks: CheckTask[];
  precheckPending: { id: string; checkQuestion: string; fixEasy: string; result: PrecheckResult | null }[];
  scriptInput: CardScriptRequest;
  activeSupplement: { id: string; deadline: string | null; deadlineConfirmed: boolean } | null;
  /** 틀 문장용: 같이 사는 사람 수 (모르면 null) */
  householdSize: number | null;
  /** 서류의 기본 순서 (id → 순위). 화면에서 체크한 뒤 다시 정렬할 때 쓴다 */
  rank: Record<string, number>;
  /** ?include=print 일 때만: 옮겨 쓰는 카드 표 */
  print?: PrintSection[];
}

interface ProgramRow { id: string; name: string }

async function loadProgram(row: AppRow): Promise<ProgramRow> {
  const db = getDb();
  const q = db.from('welfare_program').select('id, name');
  const { data, error } = row.program_id
    ? await q.eq('id', row.program_id).maybeSingle()
    : await q.eq('code', PROGRAM_CODE).maybeSingle();
  if (error) throw error;
  if (!data) throw fail(404, 'program', '제도 정보를 찾을 수 없어요.');
  return data as ProgramRow;
}

/** 제도의 칸과 이 신청 건의 답 (answers는 field key로 묶음) */
export async function loadForm(row: AppRow, programId: string): Promise<{ fields: FormField[]; answers: AnswerMap }> {
  const db = getDb();
  const [f, a] = await Promise.all([
    db.from('form_field').select('*').eq('program_id', programId).order('sort_order'),
    db.from('answer').select('field_id, value, raw_speech, input_method, is_approximate').eq('application_id', row.id),
  ]);
  if (f.error) throw f.error;
  if (a.error) throw a.error;
  const fields = (f.data ?? []).map((r) => toCamel<FormField>(r));
  const keyById = new Map(fields.map((x) => [x.id, x.key]));
  const answers: AnswerMap = {};
  for (const r of a.data ?? []) {
    const key = keyById.get(r.field_id as string);
    if (!key || r.value === null || r.value === undefined) continue;
    answers[key] = {
      fieldKey: key,
      value: r.value as Answer['value'],
      rawSpeech: (r.raw_speech as string | null) ?? null,
      inputMethod: (r.input_method as Answer['inputMethod']) ?? 'button',
      isApproximate: Boolean(r.is_approximate),
    };
  }
  return { fields, answers };
}

/** 보이는 질문의 답만 (안 보이게 된 질문의 답은 계산에서 뺀다) */
export function visibleAnswerMap(fields: FormField[], answers: AnswerMap): { visible: FormField[]; shown: AnswerMap } {
  const visible = visibleFields(fields, answers);
  const shown: AnswerMap = {};
  for (const f of visible) if (answers[f.key]) shown[f.key] = answers[f.key];
  return { visible, shown };
}

export async function loadPrecheck(row: AppRow, programId: string, shown: AnswerMap) {
  const db = getDb();
  const [r, res] = await Promise.all([
    db.from('precheck_rule').select('*').eq('program_id', programId),
    db.from('precheck_result').select('rule_id, result').eq('application_id', row.id),
  ]);
  if (r.error) throw r.error;
  if (res.error) throw res.error;
  const rules = applicablePrechecks((r.data ?? []).map((x) => toCamel<PrecheckRule>(x)), (c) => matches(c, shown));
  const results: Record<string, PrecheckResult> = {};
  for (const x of res.data ?? []) results[x.rule_id as string] = x.result as PrecheckResult;
  return { rules, results };
}

/** 기본 서류 목록을 지금 답에 맞게 고치고, 이 신청 건의 전체 목록을 돌려준다 */
async function syncChecklist(row: AppRow, programId: string, shown: AnswerMap) {
  const db = getDb();
  const [r, c] = await Promise.all([
    db.from('document_rule').select('*').eq('program_id', programId),
    db.from('checklist_item').select('*').eq('application_id', row.id),
  ]);
  if (r.error) throw r.error;
  if (c.error) throw c.error;
  const rules = (r.data ?? []).map((x) => toCamel<DocumentRule>(x));
  let items = (c.data ?? []).map((x) => toCamel<ChecklistItem>(x));

  const plan = rebuildBaseChecklist(rules, items, (cond) => matches(cond, shown));
  if (plan.toDelete.length) {
    const ids = plan.toDelete.map((i) => i.id);
    const { error } = await db.from('checklist_item').delete().eq('application_id', row.id).in('id', ids);
    if (error) throw error;
    items = items.filter((i) => !ids.includes(i.id));
  }
  if (plan.toAdd.length) {
    const { data, error } = await db
      .from('checklist_item')
      .insert(
        plan.toAdd.map((rule) => ({
          application_id: row.id,
          doc_name: rule.docName,
          easy_explain: rule.easyExplain,
          issue_place: rule.issuePlace,
          place_group: rule.placeGroup,
          source: 'base',
        })),
      )
      .select('*');
    if (error) throw error;
    items = items.concat((data ?? []).map((x) => toCamel<ChecklistItem>(x)));
  }
  return { rules, items };
}

async function loadActiveSupplement(row: AppRow) {
  const { data, error } = await getDb()
    .from('supplement_request')
    .select('id, deadline, deadline_confirmed')
    .eq('application_id', row.id)
    .is('submitted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    deadline: (data.deadline as string | null) ?? null,
    deadlineConfirmed: Boolean(data.deadline_confirmed),
  };
}

export async function loadCardData(row: AppRow, opts: { includePrint?: boolean } = {}): Promise<CardData> {
  const program = await loadProgram(row);
  const { fields, answers } = await loadForm(row, program.id);
  const { visible, shown } = visibleAnswerMap(fields, answers);

  const [{ rules: docRules, items }, pre, activeSupplement] = await Promise.all([
    syncChecklist(row, program.id, shown),
    loadPrecheck(row, program.id, shown),
    loadActiveSupplement(row),
  ]);

  const checklist = sortChecklist(items, docRules);
  const checkTasks = buildCheckTasks(visible, shown, displayAnswer);
  const supplementItems = activeSupplement
    ? checklist.filter((i) => i.supplementId === activeSupplement.id).map((i) => i.docName)
    : [];
  const applicant = shown.applicant_type?.value;

  return {
    app: publicApp(row),
    programName: program.name,
    place: placeFromAnswers(shown),
    checklist,
    docsReady: isDocsReady(checklist),
    checkTasks,
    precheckPending: pendingPrechecks(pre.rules, pre.results).map((r) => ({
      id: r.id,
      checkQuestion: r.checkQuestion,
      fixEasy: r.fixEasy,
      result: pre.results[r.id] ?? null,
    })),
    scriptInput: {
      appId: row.id,
      programName: program.name,
      helperMode: row.helper_mode,
      applicantType: typeof applicant === 'string' && applicant !== 'unknown' ? applicant : null,
      answerLines: buildAnswerLines(visible, shown, displayAnswer),
      checkLabels: checkTasks.map((t) => t.label),
      supplementItems,
    },
    activeSupplement,
    rank: Object.fromEntries(
      sortChecklist(items.map((i) => ({ ...i, isDone: false, dueDate: null })), docRules).map((i, n) => [i.id, n]),
    ),
    householdSize: typeof shown.household_size?.value === 'number' ? shown.household_size.value : null,
    ...(opts.includePrint ? { print: buildPrintSections(visible, shown, displayAnswer) } : {}),
  };
}
