// 03: 주민센터에서 할 말 요청과 AI 응답 검사
import { z } from 'zod';
import type { CardScriptRequest } from '@/lib/types';

const line = z.string().max(200);

export const cardScriptRequestSchema = z.object({
  appId: z.string().min(1).max(64),
  programName: z.string().max(100),
  helperMode: z.enum(['self', 'family', 'helper']),
  applicantType: z.string().max(20).nullable(),
  answerLines: z.array(line).max(30),
  checkLabels: z.array(line).max(30),
  supplementItems: z.array(line).max(30),
}) satisfies z.ZodType<CardScriptRequest>;

export const cardScriptResultSchema = z.object({ script: z.string().trim().min(5).max(400) });

/** 판정 표현이나 개인정보처럼 보이는 것이 있으면 쓰지 않는다 */
const FORBIDDEN = /(받을\s?수\s?있|대상이에요|대상입니다|대상자예요|탈락|선정|수급\s?가능|지급될|\d{6}-?\d{7}|01[016789]-?\d{3,4}-?\d{4})/;

export function safeScript(raw: unknown): string | null {
  const parsed = cardScriptResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  const script = parsed.data.script.replace(/\s+/g, ' ');
  return FORBIDDEN.test(script) ? null : script;
}
