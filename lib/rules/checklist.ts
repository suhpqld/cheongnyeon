// 04: 제출 준비 카드의 서류 목록 규칙 (순수 함수, 브라우저와 서버 둘 다)
// 조건 판정은 01의 matches()를 호출하는 쪽에서 넘겨받는다:
//   rebuildBaseChecklist(rules, existing, (c) => matches(c, visibleAnswers))
import type {
  AnswerMap,
  ChecklistItem,
  FormField,
  PlaceGroup,
  ShowIf,
} from '@/lib/types';

/** document_rule 한 줄 (DB → camelCase) */
export interface DocumentRule {
  id: string;
  docName: string;
  easyExplain: string | null;
  issuePlace: string | null;
  placeGroup: PlaceGroup;
  condition: ShowIf;
  sortOrder: number;
}

export type MatchFn = (cond: ShowIf) => boolean;

export interface ChecklistPlan {
  /** 새로 맞게 된 서류: 이 규칙으로 checklist_item을 만든다 (source 'base', is_done false) */
  toAdd: DocumentRule[];
  /** 더는 안 맞는 기본 서류 (또는 이름이 겹친 기본 서류): 지운다 */
  toDelete: ChecklistItem[];
  /** 그대로 두는 기본 서류 (is_done 유지) */
  keep: ChecklistItem[];
}

/**
 * 기본 서류 목록을 지금 답에 맞게 다시 맞춘다.
 * - 맞는 규칙인데 DB에 없으면 추가, 더는 안 맞으면 삭제, 이름이 같으면 그대로 둔다.
 * - source 'supplement' 항목은 건드리지 않는다.
 */
export function rebuildBaseChecklist(
  rules: DocumentRule[],
  existing: ChecklistItem[],
  match: MatchFn,
): ChecklistPlan {
  const wanted = [...rules]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => match(r.condition));
  const wantedNames = new Set(wanted.map((r) => r.docName));

  const keep: ChecklistItem[] = [];
  const toDelete: ChecklistItem[] = [];
  const seen = new Set<string>();
  for (const item of existing) {
    if (item.source !== 'base') continue;
    if (wantedNames.has(item.docName) && !seen.has(item.docName)) {
      keep.push(item);
      seen.add(item.docName);
    } else {
      toDelete.push(item);
    }
  }
  const toAdd = wanted.filter((r) => !seen.has(r.docName));
  return { toAdd, toDelete, keep };
}

/**
 * 정렬: 안 챙긴 것 먼저 → 추가 요청 기한 가까운 것 먼저 → sortOrder → 만든 시각.
 * sortOrder는 서류 이름으로 규칙에서 찾는다 (추가 서류는 기본 서류 뒤).
 */
export function sortChecklist(items: ChecklistItem[], rules: DocumentRule[] = []): ChecklistItem[] {
  const order = new Map(rules.map((r) => [r.docName, r.sortOrder]));
  const orderOf = (i: ChecklistItem) =>
    order.get(i.docName) ?? (i.source === 'supplement' ? 100000 : 50000);
  return [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    const da = a.dueDate ?? '9999-12-31';
    const db = b.dueDate ?? '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    const oa = orderOf(a);
    const ob = orderOf(b);
    if (oa !== ob) return oa - ob;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
}

/** 서류 준비 완료: 1개 이상이고 모두 챙김 (상태가 아니라 계산 값) */
export function isDocsReady(items: ChecklistItem[]): boolean {
  return items.length > 0 && items.every((i) => i.isDone);
}

export function countRemaining(items: ChecklistItem[]): number {
  return items.filter((i) => !i.isDone).length;
}

/** 받는 곳 묶음의 기본 순서 */
export const PLACE_ORDER: PlaceGroup[] = ['home', 'onsite', 'gov24', 'bank', 'work', 'tax'];

export interface PlaceGroupBlock {
  placeGroup: PlaceGroup;
  pending: ChecklistItem[];
  done: ChecklistItem[];
}

/** 받는 곳 묶음별로 나눈다. 안 챙긴 서류가 있는 묶음이 먼저, 다 챙긴 묶음은 뒤. */
export function groupByPlace(items: ChecklistItem[]): PlaceGroupBlock[] {
  const blocks = PLACE_ORDER.map((g) => ({
    placeGroup: g,
    pending: items.filter((i) => i.placeGroup === g && !i.isDone),
    done: items.filter((i) => i.placeGroup === g && i.isDone),
  })).filter((b) => b.pending.length + b.done.length > 0);
  return [
    ...blocks.filter((b) => b.pending.length > 0),
    ...blocks.filter((b) => b.pending.length === 0),
  ];
}

export interface CheckTask {
  key: string;
  label: string;
  display: string;
  checkGuide: string | null;
}

/** 확인할 것: 보이는 답 중 'unknown'이거나 대충 말한 값 */
export function buildCheckTasks(
  visible: FormField[],
  answers: AnswerMap,
  display: (field: FormField, a?: AnswerMap[string]) => string,
): CheckTask[] {
  return visible
    .filter((f) => {
      const a = answers[f.key];
      return !!a && (a.value === 'unknown' || a.isApproximate);
    })
    .map((f) => ({
      key: f.key,
      label: f.label,
      display: display(f, answers[f.key]),
      checkGuide: f.checkGuide,
    }));
}

/** 할 말 재료의 answerLines: 사는 곳, 가구, 집 섹션의 "칸 이름: 값" */
export const SCRIPT_SECTIONS = ['사는 곳', '가구', '집'];

export function buildAnswerLines(
  visible: FormField[],
  answers: AnswerMap,
  display: (field: FormField, a?: AnswerMap[string]) => string,
): string[] {
  return visible
    .filter((f) => SCRIPT_SECTIONS.includes(f.section) && answers[f.key])
    .map((f) => `${f.confirmLabel ?? f.label}: ${display(f, answers[f.key])}`);
}

/** 답에서 구와 동 (모름이면 null) */
export function placeFromAnswers(answers: AnswerMap): { district: string | null; dong: string | null } {
  const pick = (k: string) => {
    const v = answers[k]?.value;
    return typeof v === 'string' && v !== 'unknown' && v.trim() ? v.trim() : null;
  };
  return { district: pick('district'), dong: pick('dong') };
}

/** 주민센터 이름: "노원구 상계동 주민센터" / 동 모름 → "사는 동 주민센터" */
export function officeName(place: { district: string | null; dong: string | null }): string {
  if (!place.dong) return '사는 동 주민센터';
  return `${place.district ? place.district + ' ' : ''}${place.dong} 주민센터`;
}

export function naverMapUrl(place: { district: string | null; dong: string | null }): string {
  const q = [place.district, place.dong, '주민센터'].filter(Boolean).join(' ');
  return `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
}
