import { SEOUL_DISTRICTS } from '@/lib/constants'
import type { AnswerMap, AnswerValue, FormField, HelperMode } from '@/lib/types'
import { visibleFields } from '@/lib/rules/condition'

export { visibleFields }
export { SEOUL_DISTRICTS }

export function questionText(field: FormField, helperMode: HelperMode): string {
  return helperMode === 'self' ? field.questionEasy : field.questionHelper
}

export function nextField(fields: FormField[], answers: AnswerMap): FormField | null {
  return visibleFields(fields, answers).find((field) => answers[field.key] === undefined) ?? null
}

export function prevField(fields: FormField[], answers: AnswerMap, currentKey: string): FormField | null {
  const visible = visibleFields(fields, answers)
  const index = visible.findIndex((field) => field.key === currentKey)
  return index <= 0 ? null : visible[index - 1]
}

export function progress(
  fields: FormField[],
  answers: AnswerMap,
  currentKey: string,
): { index: number; total: number; remaining: number } {
  const visible = visibleFields(fields, answers)
  const currentIndex = visible.findIndex((field) => field.key === currentKey)
  const index = currentIndex < 0 ? visible.filter((field) => answers[field.key]).length : currentIndex + 1
  return { index, total: visible.length, remaining: Math.max(visible.length - index, 0) }
}

export function validateAnswer(field: FormField, value: AnswerValue): boolean {
  if (value === 'unknown') return field.allowUnknown
  switch (field.type) {
    case 'yes_no': return typeof value === 'boolean'
    case 'choice': return typeof value === 'string' && (field.options ?? []).some((option) => option.value === value)
    case 'district': return typeof value === 'string' && SEOUL_DISTRICTS.includes(normalizeDistrict(value) as (typeof SEOUL_DISTRICTS)[number])
    case 'count': return typeof value === 'number' && Number.isInteger(value) && value >= (field.minValue ?? 0) && value <= (field.maxValue ?? Number.MAX_SAFE_INTEGER)
    case 'money': return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= (field.maxValue ?? Number.MAX_SAFE_INTEGER)
    case 'text': return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 100
    // group: 한 줄씩 배열. 화면이 아직 글자 칸이라 1~300자 글자도 받는다
    case 'group': return Array.isArray(value) || (typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 300)
  }
}

export function normalizeDistrict(value: string): string {
  return value === '노원' ? '노원구' : value
}

export function checkNeeded(fields: FormField[], answers: AnswerMap): FormField[] {
  return visibleFields(fields, answers).filter((field) => {
    const answer = answers[field.key]
    return answer?.value === 'unknown' || answer?.isApproximate === true
  })
}
