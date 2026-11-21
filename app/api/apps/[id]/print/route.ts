import { PROGRAM_CODE, SECTION_ORDER } from '@/lib/constants';
import { requireApp, type AppRow } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import { loadCardData, loadForm, visibleAnswerMap, type CardData } from '../card/load';
import { buildFormSections, buildSlotValues, parseGroupText, splitKey, type FormSection, type FormSlot, type FormTemplateView } from './form-values';

export type PrintData = CardData & {
  /** 1장: 미리 채울 공식 양식 (양식 데이터가 아직 없으면 빈 배열) */
  templates: FormTemplateView[];
  /** 2장: 양식에 안 들어간 나머지 칸 (양식이 없으면 모든 칸) */
  leftover: FormSection[];
  /** 출력 화면 입력칸에 미리 넣을 값 (주소 등. 저장된 답으로 만든 것) */
  localPrefill: Record<string, string>;
  /** 묶음 답의 줄 수 (members: 3 → 가족 입력칸 3묶음만 보여 줌) */
  groupCounts: Record<string, number>;
};

async function programChecks(pid: string): Promise<string[]> {
  const { data, error } = await getDb().from('welfare_program').select('form_checks').eq('id', pid).maybeSingle();
  if (error || !data) return [];
  const v = (data as { form_checks?: unknown }).form_checks;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

async function programId(row: AppRow): Promise<string> {
  if (row.program_id) return row.program_id;
  const { data, error } = await getDb().from('welfare_program').select('id').eq('code', PROGRAM_CODE).maybeSingle();
  if (error) throw error;
  if (!data) throw fail(404, 'program', '제도 정보를 찾을 수 없어요.');
  return data.id as string;
}

interface TemplateRow {
  code: string;
  name: string;
  page_images: unknown;
  sort_order: number;
  form_slot: Record<string, unknown>[] | null;
}

/** form_template + form_slot. 표가 아직 없거나(migration_10 전) 비어 있으면 빈 배열 */
async function loadTemplates(pid: string) {
  const { data, error } = await getDb()
    .from('form_template')
    .select('code, name, page_images, sort_order, form_slot(*)')
    .eq('program_id', pid)
    .order('sort_order');
  if (error) {
    console.warn('[print] 양식 데이터를 못 읽어서 표로 출력해요:', error.code, error.message);
    return [];
  }
  return ((data ?? []) as TemplateRow[]).map((t) => ({
    code: t.code,
    name: t.name,
    pageImages: Array.isArray(t.page_images) ? t.page_images.filter((p): p is string => typeof p === 'string') : [],
    slots: (t.form_slot ?? []).map((s) => {
      const c = toCamel<FormSlot>(s);
      return { ...c, x: Number(c.x), y: Number(c.y), w: Number(c.w), h: Number(c.h), fontPt: Number(c.fontPt) || 10 };
    }),
  }));
}

// 🔒 GET /api/apps/[id]/print → 양식 칸별 값 + 준비 카드 데이터
// 이름, 주민등록번호, 전화번호는 여기서 다루지 않는다 (출력 화면에서만 타이핑)
export const GET = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const pid = await programId(row);

  const [card, form, rawTemplates, checks] = await Promise.all([
    loadCardData(row),
    loadForm(row, pid),
    loadTemplates(pid),
    programChecks(pid),
  ]);
  const { visible, shown } = visibleAnswerMap(form.fields, form.answers);
  const fieldsByKey = new Map(form.fields.map((f) => [f.key, f]));
  const visibleKeys = new Set(visible.map((f) => f.key));

  const templates: FormTemplateView[] = rawTemplates
    .filter((t) => t.pageImages.length > 0)
    .map((t) => ({ ...t, slots: buildSlotValues(t.slots, fieldsByKey, visibleKeys, shown, checks) }));

  const onForm = new Set(templates.flatMap((t) => t.slots.flatMap((s) => (s.fieldKey ? [splitKey(s.fieldKey).root] : []))));
  const leftover = buildFormSections(visible, shown, SECTION_ORDER, onForm);

  const str = (k: string) => {
    const v = shown[k]?.value;
    return typeof v === 'string' && v !== 'unknown' ? v : '';
  };
  const address = ['서울특별시', str('district'), str('dong')].filter(Boolean).join(' ');
  const localPrefill: Record<string, string> = {};
  if (str('district')) localPrefill['applicant.address'] = address;

  const groupCounts: Record<string, number> = {};
  for (const f of visible) {
    if (f.type !== 'group') continue;
    const v = shown[f.key]?.value as unknown;
    groupCounts[f.key] = Array.isArray(v) ? v.length : typeof v === 'string' && v !== 'unknown' && v.trim() ? parseGroupText(f.key, v).length : 0;
  }
  // 같이 사는 사람 수만 답한 경우: 본인 빼고 가족 줄 수
  if (groupCounts.members === undefined && typeof shown.household_size?.value === 'number') {
    groupCounts.members = Math.max(0, Math.min(4, (shown.household_size.value as number) - 1));
  }

  return ok({ ...card, templates, leftover, localPrefill, groupCounts } satisfies PrintData);
});
