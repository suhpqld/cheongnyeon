// 10 S4: "남은 것" 계산 (순수 함수, 서버와 브라우저가 같이 쓴다)
// 남은 것 = 안 챙긴 서류 + 확인할 것(모름, 대충) + 아니요나 모름으로 답한(또는 안 한) 자주 빠지는 것
import type { CheckTask } from '@/lib/rules/checklist';
import type { ChecklistItem, PrecheckResult } from '@/lib/types';

export interface PendingPrecheck {
  id: string;
  checkQuestion: string;
  fixEasy: string;
  result: PrecheckResult | null;
}

export type RemainingItem =
  | { kind: 'doc'; id: string; label: string }
  | { kind: 'check'; id: string; label: string; display: string; checkGuide: string | null }
  | { kind: 'precheck'; id: string; label: string; fixEasy: string; result: PrecheckResult | null };

export type CheckItem = Extract<RemainingItem, { kind: 'check' }>;
export type PrecheckItem = Extract<RemainingItem, { kind: 'precheck' }>;

export const isCheckItem = (i: RemainingItem): i is CheckItem => i.kind === 'check';
export const isPrecheckItem = (i: RemainingItem): i is PrecheckItem => i.kind === 'precheck';

export interface Remaining {
  items: RemainingItem[];
  count: number;
  docs: number;
  checks: number;
  prechecks: number;
}

export interface RemainingSource {
  checklist: ChecklistItem[];
  checkTasks: CheckTask[];
  precheckPending: PendingPrecheck[];
}

export function computeRemaining(d: RemainingSource): Remaining {
  const docs: RemainingItem[] = d.checklist
    .filter((i) => !i.isDone)
    .map((i) => ({ kind: 'doc', id: i.id, label: i.docName }));
  const checks: RemainingItem[] = d.checkTasks.map((t) => ({
    kind: 'check',
    id: t.key,
    label: t.label,
    display: t.display,
    checkGuide: t.checkGuide,
  }));
  const prechecks: RemainingItem[] = d.precheckPending
    .filter((p) => p.result !== 'yes')
    .map((p) => ({ kind: 'precheck', id: p.id, label: p.checkQuestion, fixEasy: p.fixEasy, result: p.result }));
  const items = [...docs, ...checks, ...prechecks];
  return { items, count: items.length, docs: docs.length, checks: checks.length, prechecks: prechecks.length };
}

export const READY_DONE_TEXT = '준비 끝! 이대로 가면 한 번에 낼 수 있어요';

export function remainingTitle(count: number): string {
  return `주민센터에 한 번에 내기까지 남은 것 ${count}개`;
}

/** 맨 위에서 읽어 줄 말 */
export function remainingSpeakText(r: Remaining): string {
  if (r.count === 0) return READY_DONE_TEXT;
  const parts: string[] = [];
  if (r.docs) parts.push(`챙길 서류 ${r.docs}개`);
  if (r.checks) parts.push(`확인할 것 ${r.checks}개`);
  if (r.prechecks) parts.push(`자주 빠지는 것 ${r.prechecks}개`);
  return `${remainingTitle(r.count)}예요. ${parts.join(', ')}가 남았어요.`;
}
