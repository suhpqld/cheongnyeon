// 01 기반이 main에 들어오면 아래 임시 타입을 @/lib/types import로 교체한다.
export type FieldType = 'yes_no' | 'choice' | 'district' | 'count' | 'money' | 'text'
export type AnswerValue = boolean | number | string

export type Condition = {
  field: string
  op: 'eq' | 'neq' | 'in' | 'gt' | 'lt'
  value: unknown
}

export type ShowIf = Condition | Condition[] | null

export type FieldOption = { value: string; label: string }

export type FormField = {
  id: string
  key: string
  label: string
  questionEasy: string
  questionHelper: string
  helpEasy: string | null
  type: FieldType
  options: FieldOption[] | null
  required: boolean
  allowUnknown: boolean
  minValue: number | null
  maxValue: number | null
  showIf: ShowIf
  sortOrder: number
}

export type Answer = {
  fieldKey: string
  value: AnswerValue
  rawSpeech: string | null
  inputMethod: 'voice' | 'button' | 'text' | 'unknown'
  isApproximate: boolean
}

export type AnswerMap = Record<string, Answer>

export const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
  '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
  '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
] as const

function answerValue(answers: AnswerMap, key: string): AnswerValue | undefined {
  return answers[key]?.value
}

function matches(condition: Condition, answers: AnswerMap): boolean {
  const actual = answerValue(answers, condition.field)
  switch (condition.op) {
    case 'eq': return actual === condition.value
    case 'neq': return actual !== condition.value
    case 'in': return Array.isArray(condition.value) && condition.value.includes(actual)
    case 'gt': return typeof actual === 'number' && actual > Number(condition.value)
    case 'lt': return typeof actual === 'number' && actual < Number(condition.value)
  }
}

export function isVisible(field: FormField, answers: AnswerMap): boolean {
  if (!field.showIf) return true
  return Array.isArray(field.showIf)
    ? field.showIf.every((condition) => matches(condition, answers))
    : matches(field.showIf, answers)
}

export function visibleFields(fields: FormField[], answers: AnswerMap): FormField[] {
  return fields.filter((field) => isVisible(field, answers)).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function questionText(field: FormField, helperMode: 'self' | 'family' | 'helper'): string {
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
