import { PLACE_LABEL, SEOUL_DISTRICTS } from '@/lib/constants';
import { ddayFrom } from '@/lib/format';
import type { SharedView } from '@/lib/rules/progress';
import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { AppStatus, PlaceGroup } from '@/lib/types';

const expired = () => fail(404, 'expired', '링크가 멈췄거나 기간이 지났어요. 보낸 분께 다시 받아 주세요.');
const familyWords = /부양의무자|가족|자녀|위임장|대리인/;
const supplementNames = [
  '금융정보 등 제공 동의서', '가족관계증명서', '급여명세서', '고용임금 확인서', '소득금액증명',
  '임대차계약서', '집 계약서 복사본', '자녀 동의서', '주민등록등본', '주민등록초본',
  '통장 거래 내역', '통장 사본', '위임장',
  '자동차등록증', '부채 증명서', '신분증',
];

function placeTitle(value: unknown): string {
  return typeof value === 'string' && Object.hasOwn(PLACE_LABEL, value)
    ? PLACE_LABEL[value as PlaceGroup].title
    : '받은 종이에서 확인해 주세요';
}

export const GET = withErrors(async (_request: Request, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  if (!/^[a-z2-9]{10}$/.test(code)) return expired();

  const db = getDb();
  const now = new Date().toISOString();
  const { data: app, error } = await db.from('application').select('id, program_id, status, submitted_at, share_expires_at')
    .eq('share_code', code).gt('share_expires_at', now).gt('expires_at', now).maybeSingle();
  if (error) throw error;
  if (!app) return expired();

  const programId = app.program_id;
  const [program, programDocs, districtField, checklist, latest] = await Promise.all([
    programId ? db.from('welfare_program').select('name').eq('id', programId).maybeSingle() : null,
    programId ? db.from('document_rule').select('doc_name').eq('program_id', programId) : null,
    programId ? db.from('form_field').select('id').eq('program_id', programId).eq('key', 'district').maybeSingle() : null,
    db.from('checklist_item').select('doc_name,place_group,is_done,source,supplement_id')
      .eq('application_id', app.id).order('created_at').order('id'),
    db.from('supplement_request').select('id,deadline,deadline_confirmed,parsed_json')
      .eq('application_id', app.id).is('submitted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [program, programDocs, districtField, checklist, latest]) {
    if (result?.error) throw result.error;
  }

  let district: string | null = null;
  if (districtField?.data) {
    const answer = await db.from('answer').select('value')
      .eq('application_id', app.id).eq('field_id', districtField.data.id).maybeSingle();
    if (answer.error) throw answer.error;
    district = SEOUL_DISTRICTS.find(name => name === answer.data?.value) ?? null;
  }

  // Labels derived from an uploaded or typed notice may include personal details.
  // Only names from the program catalog or the fixed vocabulary can appear in the public response.
  const trustedNames = (programDocs?.data ?? []).map(rule => String(rule.doc_name));
  const safeNames = [...new Set([...trustedNames, ...supplementNames])].sort((a, b) => b.length - a.length);
  function safeDocumentName(value: unknown): string | undefined {
    return typeof value === 'string' ? safeNames.find(name => value.includes(name)) : undefined;
  }

  const pending = latest.data;
  const deadline = pending?.deadline_confirmed ? pending.deadline : null;
  const entries = checklist.data ?? [];
  const sharedChecklist: SharedView['checklist'] = entries.map((item, index) => ({
    docName: safeDocumentName(item.doc_name) ?? '챙길 서류 ' + (index + 1),
    placeTitle: placeTitle(item.place_group),
    isDone: item.is_done,
    source: item.source,
    dueDate: pending && item.supplement_id === pending.id ? deadline : null,
  }));
  const noticeItems: unknown = pending?.parsed_json?.items;
  const rawItems = Array.isArray(noticeItems) ? noticeItems : [];
  const items = rawItems.map((item, index) => ({
    easyName: safeDocumentName(item?.easyName) ?? safeDocumentName(item?.name) ?? '추가 서류 ' + (index + 1),
    issuePlace: placeTitle(item?.placeGroup),
  }));

  // Recheck the link after the parallel reads so a revoked or expired link stops serving immediately.
  const finishedAt = new Date().toISOString();
  const current = await db.from('application').select('id')
    .eq('id', app.id).eq('share_code', code).gt('share_expires_at', finishedAt).gt('expires_at', finishedAt).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) return expired();

  const view: SharedView = {
    programName: program?.data?.name ?? '복지 신청',
    district,
    status: app.status as AppStatus,
    docsReady: entries.length > 0 && entries.every(item => item.is_done),
    submittedAt: app.submitted_at,
    checklist: sharedChecklist,
    supplement: pending ? { deadline, dday: deadline ? ddayFrom(deadline) : null, items } : null,
    familyHelpNeeded: sharedChecklist.some(item => familyWords.test(item.docName)) ||
      items.some(item => familyWords.test(item.easyName)),
    expiresAt: app.share_expires_at,
  };
  return ok(view);
});
