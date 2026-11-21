// 03: 말 읽기 요청과 AI 응답 검사
import { z } from 'zod';
import { formatWon } from '@/lib/format';
import type { AnswerValue, ExtractRequest, ExtractResult, FieldType, FormField } from '@/lib/types';

const answerValue = z.union([z.boolean(), z.number(), z.string()]);
const fieldType = z.enum(['yes_no', 'choice', 'district', 'count', 'money', 'text']);
const option = z.object({ value: z.string(), label: z.string() });
const clarify = z
  .object({
    question: z.string().max(200),
    options: z.array(z.object({ label: z.string().max(100), value: answerValue })).max(6),
  })
  .nullable();

/** POST /api/extract 본문 (ExtractRequest) */
export const extractRequestSchema = z.object({
  appId: z.string().min(1).max(64),
  utterance: z.string().trim().min(1).max(500),
  helperMode: z.enum(['self', 'family', 'helper']),
  field: z.object({
    key: z.string().max(64),
    type: fieldType,
    questionEasy: z.string().max(300),
    options: z.array(option).max(20).nullable(),
    allowUnknown: z.boolean(),
    minValue: z.number().nullable(),
    maxValue: z.number().nullable(),
  }),
  otherFields: z
    .array(
      z.object({
        key: z.string().max(64),
        type: fieldType,
        questionEasy: z.string().max(300),
        options: z.array(option).max(20).nullable(),
      }),
    )
    .max(30),
  clarify,
}) satisfies z.ZodType<ExtractRequest>;

/** AI가 돌려준 JSON 모양 */
export const extractResultSchema = z.object({
  value: answerValue.nullable(),
  confidence: z.enum(['high', 'low']),
  isApproximate: z.boolean().default(false),
  heardAs: z.string().max(200).default(''),
  clarifyQuestion: z.string().max(200).nullable().default(null),
  clarifyOptions: z
    .array(z.object({ label: z.string().max(100), value: answerValue }))
    .max(6)
    .nullable()
    .default(null),
  otherValues: z
    .array(z.object({ key: z.string(), value: answerValue, isApproximate: z.boolean().default(false) }))
    .max(30)
    .default([]),
});

type TypedField = Pick<FormField, 'type' | 'options' | 'allowUnknown' | 'minValue' | 'maxValue'>;

/** 값이 그 칸 type에 맞는지. 맞으면 고친 값, 아니면 undefined */
function fitValue(field: TypedField, v: AnswerValue): AnswerValue | undefined {
  if (v === 'unknown') return field.allowUnknown ? v : undefined;
  const inRange = (n: number) =>
    (field.minValue === null || n >= field.minValue) && (field.maxValue === null || n <= field.maxValue);
  switch (field.type as FieldType) {
    case 'yes_no':
      return typeof v === 'boolean' ? v : undefined;
    case 'count':
    case 'money': {
      const n = typeof v === 'string' ? Number(v.replace(/[,\s원]/g, '')) : v;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return undefined;
      const r = Math.round(n);
      return inRange(r) ? r : undefined;
    }
    case 'choice':
      return typeof v === 'string' && field.options?.some((o) => o.value === v) ? v : undefined;
    case 'district':
    case 'text':
      return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  }
}

/**
 * AI 응답을 검사하고 칸 type에 맞게 정리한다.
 * value가 형식에 안 맞으면 null을 돌려준다 (부르는 쪽이 직접 읽기로 바꿈).
 */
export function normalizeExtract(
  field: TypedField & { key: string },
  otherFields: Pick<FormField, 'key' | 'type' | 'options'>[],
  raw: unknown,
): ExtractResult | null {
  const parsed = extractResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;

  let value: AnswerValue | null = null;
  if (r.value !== null) {
    const fit = fitValue(field, r.value);
    if (fit === undefined) return null;
    value = fit;
  }
  const confidence = value === null ? 'low' : r.confidence;
  const isApproximate = field.type === 'money' && typeof value === 'number' && value > 0 ? r.isApproximate : false;

  let heardAs = r.heardAs.trim();
  if (!heardAs && value !== null) {
    if (value === 'unknown') heardAs = '잘 모름 (확인 필요)';
    else if (field.type === 'money' && typeof value === 'number')
      heardAs = (isApproximate ? '약 ' : '') + formatWon(value).replace(/^약 /, '');
    else heardAs = String(value);
  }

  const others = new Map(otherFields.map((f) => [f.key, f]));
  const otherValues = r.otherValues.flatMap((o) => {
    const f = others.get(o.key);
    if (!f || o.key === field.key) return [];
    const fit = fitValue({ type: f.type, options: f.options, allowUnknown: true, minValue: null, maxValue: null }, o.value);
    if (fit === undefined || fit === 'unknown') return [];
    return [{ key: o.key, value: fit, isApproximate: f.type === 'money' ? o.isApproximate : false }];
  });

  return {
    value,
    confidence,
    isApproximate,
    heardAs,
    clarifyQuestion: confidence === 'low' ? r.clarifyQuestion : null,
    clarifyOptions: confidence === 'low' && r.clarifyOptions?.length ? r.clarifyOptions : null,
    otherValues,
  };
}
