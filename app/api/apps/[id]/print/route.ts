import { PROGRAM_CODE, SECTION_ORDER } from '@/lib/constants';
import { requireApp, type AppRow } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import { loadCardData, loadForm, visibleAnswerMap, type CardData } from '../card/load';
import { buildFormSections, buildSlotValues, type FormSection, type FormSlot, type FormTemplateView } from './form-values';

export type PrintData = CardData & {
  /** 1장: 미리 채울 공식 양식 (양식 데이터가 아직 없으면 빈 배열) */
  templates: FormTemplateView[];
  /** 2장: 양식에 안 들어간 나머지 칸 (양식이 없으면 모든 칸) */
  leftover: FormSection[];
};

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

  const [card, form, rawTemplates] = await Promise.all([
    loadCardData(row),
    loadForm(row, pid),
    loadTemplates(pid),
  ]);
  const { visible, shown } = visibleAnswerMap(form.fields, form.answers);
  const fieldsByKey = new Map(form.fields.map((f) => [f.key, f]));
  const visibleKeys = new Set(visible.map((f) => f.key));

  const templates: FormTemplateView[] = rawTemplates
    .filter((t) => t.pageImages.length > 0)
    .map((t) => ({ ...t, slots: buildSlotValues(t.slots, fieldsByKey, visibleKeys, shown) }));

  const onForm = new Set(templates.flatMap((t) => t.slots.flatMap((s) => (s.fieldKey ? [s.fieldKey] : []))));
  const leftover = buildFormSections(visible, shown, SECTION_ORDER, onForm);

  return ok({ ...card, templates, leftover } satisfies PrintData);
});
