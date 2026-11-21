// 10 S5: 공식 양식 칸에 들어갈 값 (순수 함수, 서버와 브라우저가 같이 쓴다)
// 규칙(10의 4장, 8장): 모르는 값과 대충 금액은 빈칸 + "확인 후 적기" / choice는 체크 위치로 / 금액은 숫자에 쉼표
import { groupSummary } from '@/lib/format';
import type { Answer, FormField } from '@/lib/types';

export type LocalOnly = 'name' | 'rrn' | 'phone' | 'signature';

/** form_slot 한 줄 (x, y, w, h는 그림 대비 퍼센트) */
export interface FormSlot {
  id: string;
  fieldKey: string | null;
  localOnly: LocalOnly | null;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  render: 'text' | 'check';
  checkValue: string | null;
  fontPt: number;
}

export interface SlotValue {
  text: string;
  checked: boolean;
  needsCheck: boolean;
}

export type FormSlotView = FormSlot & { value: SlotValue };

export interface FormTemplateView {
  code: string;
  name: string;
  pageImages: string[];
  slots: FormSlotView[];
}

/** 출력 화면에서만 타이핑하는 값 (저장하지 않는다) */
export type LocalValues = Partial<Record<Exclude<LocalOnly, 'signature'>, string>>;

export const CHECK_LATER = '확인 후 적기';

const numberKo = new Intl.NumberFormat('ko-KR');

/** 양식 칸에 적을 글. 모름, 대충, 안 한 답은 빈칸 + needsCheck */
export function displayForForm(field: Pick<FormField, 'type' | 'options'>, answer?: Answer): { text: string; needsCheck: boolean } {
  if (!answer) return { text: '', needsCheck: true };
  const { value, isApproximate } = answer;
  if (value === 'unknown' || isApproximate) return { text: '', needsCheck: true };
  if (Array.isArray(value)) return { text: groupSummary(value), needsCheck: false };
  switch (field.type) {
    case 'money':
      return { text: numberKo.format(Number(value)), needsCheck: false };
    case 'count':
      return { text: String(value), needsCheck: false };
    case 'yes_no':
      return { text: value === true ? '예' : '아니요', needsCheck: false };
    case 'choice':
      return { text: field.options?.find((o) => o.value === value)?.label ?? String(value), needsCheck: false };
    default:
      return { text: String(value), needsCheck: false };
  }
}

/** 체크 칸에서 비교할 값 ("true", "false", "monthly") */
const valueKey = (v: Answer['value']): string => String(v);

/**
 * 칸마다 값. 안 보이는 질문의 칸은 빈칸(표시 없음).
 * 같은 질문의 체크 칸이 여러 개면 "확인 후 적기"는 첫 칸에만 붙인다.
 */
export function buildSlotValues(
  slots: FormSlot[],
  fieldsByKey: Map<string, FormField>,
  visibleKeys: Set<string>,
  answers: Record<string, Answer>,
): FormSlotView[] {
  const marked = new Set<string>();
  return [...slots]
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    .map((slot) => {
      const empty: SlotValue = { text: '', checked: false, needsCheck: false };
      const field = slot.fieldKey ? fieldsByKey.get(slot.fieldKey) : undefined;
      if (slot.localOnly || !slot.fieldKey || !field || !visibleKeys.has(slot.fieldKey)) return { ...slot, value: empty };

      const answer = answers[slot.fieldKey];
      const shown = displayForForm(field, answer);
      let needsCheck = shown.needsCheck;
      if (needsCheck && slot.render === 'check') {
        needsCheck = !marked.has(slot.fieldKey);
        marked.add(slot.fieldKey);
      }
      if (slot.render === 'check') {
        const checked = !shown.needsCheck && !!answer && valueKey(answer.value) === slot.checkValue;
        return { ...slot, value: { text: '', checked, needsCheck } };
      }
      return { ...slot, value: { text: shown.text, checked: false, needsCheck } };
    });
}

export interface FormRow {
  key: string;
  label: string; // 공식 칸 이름
  text: string; // 적을 내용 (확인할 것이면 빈칸)
  note: string | null; // "확인 후 적기", "아직 안 적었어요"
}

export interface FormSection {
  section: string;
  rows: FormRow[];
}

/** 보이는 칸을 섹션 순서대로 (exclude에 있는 칸은 뺀다: 양식 그림에 이미 들어간 칸) */
export function buildFormSections(
  visible: FormField[],
  answers: Record<string, Answer>,
  sectionOrder: string[],
  exclude: Set<string> = new Set(),
): FormSection[] {
  const order = [...sectionOrder, ...visible.map((f) => f.section).filter((s) => !sectionOrder.includes(s))];
  return [...new Set(order)]
    .map((section) => ({
      section,
      rows: visible
        .filter((f) => f.section === section && !exclude.has(f.key))
        .map((f): FormRow => {
          const a = answers[f.key];
          const shown = displayForForm(f, a);
          return {
            key: f.key,
            label: f.label,
            text: shown.text,
            note: !a ? '아직 안 적었어요' : shown.needsCheck ? CHECK_LATER : null,
          };
        }),
    }))
    .filter((s) => s.rows.length > 0);
}
