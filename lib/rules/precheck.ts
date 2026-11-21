// 04: 내기 전 점검 규칙 (순수 함수, 브라우저와 서버 둘 다)
// 점검 결과는 판정이 아니다. 자주 나오는 보완 사유를 미리 확인하는 용도.
import type { PrecheckResult, PrecheckRule, ShowIf } from '@/lib/types';

export type PrecheckResults = Record<string, PrecheckResult>;

/** 해당되는 점검: match(rule.condition)이 참인 것, sortOrder 순 */
export function applicablePrechecks(
  rules: PrecheckRule[],
  match: (cond: ShowIf) => boolean,
): PrecheckRule[] {
  return [...rules].sort((a, b) => a.sortOrder - b.sortOrder).filter((r) => match(r.condition));
}

/** 남은 점검: 결과가 no, unknown, 또는 아직 안 함 */
export function pendingPrechecks(rules: PrecheckRule[], results: PrecheckResults): PrecheckRule[] {
  return rules.filter((r) => results[r.id] !== 'yes');
}

export function countPendingPrechecks(rules: PrecheckRule[], results: PrecheckResults): number {
  return pendingPrechecks(rules, results).length;
}

/** 아직 안 한 첫 점검의 순서. 다 했으면 -1 */
export function firstUndoneIndex(rules: PrecheckRule[], results: PrecheckResults): number {
  return rules.findIndex((r) => !results[r.id]);
}

/** 결과가 no나 unknown이면 고치는 방법을 보여 준다 */
export function needsFix(result: PrecheckResult | null | undefined): boolean {
  return result === 'no' || result === 'unknown';
}

/** 화면에서 읽어 줄 말 */
export function precheckSpeakText(rule: PrecheckRule): string {
  return `${rule.checkQuestion} ${rule.whyEasy}`;
}
