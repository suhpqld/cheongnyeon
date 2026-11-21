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
  /** 저장하지 않고 출력 화면에서만 적는 값의 이름 (applicant.name, members.2.rrn ...) */
  localKey: string | null;
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

/** 출력 화면에서만 타이핑하는 값 (저장하지 않는다). 키는 local_key 또는 예전 local_only */
export type LocalValues = Record<string, string | undefined>;

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


/** "members.2.job" → { root: "members", row: 2, sub: "job" } / "account.bank" → row 1 */
export function splitKey(key: string): { root: string; row: number; sub: string | null } {
  const parts = key.split('.');
  if (parts.length === 3) return { root: parts[0], row: Number(parts[1]) || 1, sub: parts[2] };
  if (parts.length === 2) return { root: parts[0], row: 1, sub: parts[1] };
  return { root: key, row: 1, sub: null };
}

const RELATION_WORDS: [RegExp, string][] = [
  [/엄마|어머니|어머님/g, '어머니'], [/아빠|아버지|아버님/g, '아버지'], [/할머니/g, '할머니'], [/할아버지/g, '할아버지'],
  [/남편/g, '남편'], [/아내|부인|와이프/g, '아내'], [/배우자/g, '배우자'], [/아들/g, '아들'], [/딸/g, '딸'],
  [/며느리/g, '며느리'], [/사위/g, '사위'], [/손자/g, '손자'], [/손녀/g, '손녀'], [/누나/g, '누나'], [/언니/g, '언니'],
  [/오빠/g, '오빠'], [/남동생/g, '남동생'], [/여동생/g, '여동생'], [/(?<![남여])동생/g, '동생'], [/(?<![가-힣])형(?![가-힣]*편)/g, '형'],
];

/** 글자로만 답한 묶음 답("엄마 아빠 누나, 다 건강하고 일 해")을 줄로 나눈다 */
export function parseGroupText(root: string, text: string): Record<string, string>[] {
  if (root === 'account') return [{ bank: text.trim(), relation: '본인' }];
  const found: { at: number; word: string }[] = [];
  for (const [re, word] of RELATION_WORDS) for (const m of text.matchAll(re)) found.push({ at: m.index ?? 0, word });
  found.sort((a, b) => a.at - b.at);
  const healthy = /건강/.test(text) && !/아프|아파|질병|장애/.test(text);
  const working = /일\s*(하|해|다니)|직장|회사|출근/.test(text);
  return found.slice(0, 4).map(({ word }) => {
    const row: Record<string, string> = { relation: word };
    if (root === 'members') {
      row.living = '동거';
      if (healthy) row.health = '건강함';
      if (working) row.job = '근로';
    }
    return row;
  });
}

/** 신청서 칸에 쓸 글: choice는 값이 한글이면 값(본인), 아니면 보기 문구 */
function slotTextFor(field: FormField, value: unknown): string {
  if (value === null || value === undefined || value === '' || value === 'unknown') return '';
  if (field.type === 'choice' && typeof value === 'string' && !/[가-힣]/.test(value)) {
    return field.options?.find((o) => o.value === value)?.label ?? value;
  }
  if (field.type === 'money' && typeof value === 'number') return numberKo.format(value);
  if (typeof value === 'boolean') return value ? '예' : '아니요';
  return String(value);
}

const matches = (checkValue: string | null, v: unknown) =>
  checkValue !== null && v !== undefined && v !== null && checkValue.split('|').includes(String(v));

/**
 * 칸마다 값. 안 보이는 질문의 칸은 빈칸(표시 없음).
 * local_key 칸은 비워 두고 화면에서 채운다.
 * field_key: 답 키, 묶음 답은 점 경로(members.1.job), '@program'은 제도별 체크.
 */
export function buildSlotValues(
  slots: FormSlot[],
  fieldsByKey: Map<string, FormField>,
  visibleKeys: Set<string>,
  answers: Record<string, Answer>,
  programChecks: string[] = [],
): FormSlotView[] {
  const marked = new Set<string>();
  return [...slots]
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    .map((slot) => {
      const empty: SlotValue = { text: '', checked: false, needsCheck: false };
      if (slot.localKey || slot.localOnly || !slot.fieldKey) return { ...slot, value: empty };
      if (slot.fieldKey === '@program') {
        return { ...slot, value: { text: '', checked: programChecks.includes(slot.checkValue ?? ''), needsCheck: false } };
      }
      const { root, row, sub } = splitKey(slot.fieldKey);
      const field = fieldsByKey.get(root);
      if (!field || !visibleKeys.has(root)) return { ...slot, value: empty };
      const answer = answers[root];

      // 묶음 답 (가족, 부양의무자, 계좌)
      if (sub) {
        const v = answer?.value as unknown;
        let cell: unknown;
        if (Array.isArray(v)) cell = (v[row - 1] as Record<string, unknown> | undefined)?.[sub];
        else if (typeof v === 'string' && v !== 'unknown') cell = parseGroupText(root, v)[row - 1]?.[sub];
        if (slot.render === 'check') return { ...slot, value: { text: '', checked: matches(slot.checkValue, cell), needsCheck: false } };
        return { ...slot, value: { text: slotTextFor(field, cell), checked: false, needsCheck: false } };
      }

      const shown = displayForForm(field, answer);
      let needsCheck = shown.needsCheck;
      if (needsCheck && slot.render === 'check') {
        needsCheck = !marked.has(slot.fieldKey);
        marked.add(slot.fieldKey);
      }
      if (slot.render === 'check') {
        const checked = !shown.needsCheck && !!answer && matches(slot.checkValue, answer.value);
        return { ...slot, value: { text: '', checked, needsCheck } };
      }
      const text = shown.needsCheck ? '' : slotTextFor(field, answer?.value);
      return { ...slot, value: { text, checked: false, needsCheck } };
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
