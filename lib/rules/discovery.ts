import { displayAnswer } from '@/lib/format';
import { matches, visibleFields } from '@/lib/rules/condition';
import { buildCheckTasks, type CheckTask, type DocumentRule } from '@/lib/rules/checklist';
import type { AnswerMap, FormField, PrecheckRule } from '@/lib/types';

export interface DiscoveryResult {
  newlyRequiredDocs: DocumentRule[];
  newChecks: CheckTask[];
  newPrechecks: PrecheckRule[];
}

function uniqueById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** 답변 저장 전후의 규칙 결과를 비교해 이번 저장에서 처음 생긴 항목만 돌려준다. */
export function discoverNewItems(
  fields: FormField[],
  before: AnswerMap,
  after: AnswerMap,
  documentRules: DocumentRule[],
  precheckRules: PrecheckRule[],
): DiscoveryResult {
  const newlyRequiredDocs = uniqueById(
    documentRules.filter((rule) => !matches(rule.condition, before) && matches(rule.condition, after)),
    (rule) => rule.id,
  );

  const beforeVisible = visibleFields(fields, before);
  const afterVisible = visibleFields(fields, after);
  const beforeChecks = buildCheckTasks(beforeVisible, before, displayAnswer);
  const afterChecks = buildCheckTasks(afterVisible, after, displayAnswer);
  const beforeCheckIds = new Set(beforeChecks.map((check) => check.key));
  const newChecks = uniqueById(afterChecks.filter((check) => !beforeCheckIds.has(check.key)), (check) => check.key);

  const beforePrecheckIds = new Set(precheckRules.filter((rule) => matches(rule.condition, before)).map((rule) => rule.id));
  const newPrechecks = uniqueById(
    precheckRules.filter((rule) => matches(rule.condition, after) && !beforePrecheckIds.has(rule.id)),
    (rule) => rule.id,
  );

  return { newlyRequiredDocs, newChecks, newPrechecks };
}
