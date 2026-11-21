import type { AnswerMap, FormField, ShowIf } from '../types';

export function matches(condition: ShowIf, answers: AnswerMap): boolean {
  if (condition === null) return true;
  if (Array.isArray(condition)) return condition.every(item => matches(item, answers));
  const value = answers[condition.field]?.value;
  if (value === undefined || value === 'unknown') return false;
  switch (condition.op) {
    case 'eq': return value === condition.value;
    case 'neq': return value !== condition.value;
    case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
    case 'gt': return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
    case 'lt': return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
  }
}

export function isVisible(field: FormField, answers: AnswerMap): boolean {
  return matches(field.showIf, answers);
}

export function visibleFields(fields: FormField[], answers: AnswerMap): FormField[] {
  return fields.filter(field => isVisible(field, answers)).sort((a, b) => a.sortOrder - b.sortOrder);
}
