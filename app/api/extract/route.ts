import { EXTRACT_SYSTEM, extractUserMessage } from '@/lib/ai/extract-prompt';
import { extractRequestSchema, normalizeExtract } from '@/lib/ai/extract-schema';
import { DEMO_EXTRACT, isDemoMode } from '@/lib/ai/demo-responses';
import { localExtract } from '@/lib/parse-korean';
import { callAI } from '@/lib/server/ai';
import { useAiCall } from '@/lib/server/ai-limit';
import { requireApp } from '@/lib/server/auth';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { ExtractResult } from '@/lib/types';

export const maxDuration = 30;

// 🔒 POST /api/extract  ExtractRequest → ExtractResult
export const POST = withErrors(async (request: Request) => {
  const body = extractRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, 'invalid', '말을 다시 해 주세요.');
  const req = body.data;
  await requireApp(request, req.appId);
  await useAiCall(req.appId);

  let result: ExtractResult | null = null;
  try {
    const raw = await callAI({ kind: 'text', system: EXTRACT_SYSTEM, user: extractUserMessage(req), timeoutMs: 15_000 });
    result = normalizeExtract(req.field, req.otherFields, raw);
  } catch {
    result = null; // AI 실패 → 아래 직접 읽기
  }

  if (!result) {
    const local = localExtract(req.field, req.utterance);
    // 발표 안전장치: 직접 읽기도 못 하면 준비된 응답
    result = local.value === null && isDemoMode() && DEMO_EXTRACT[req.field.key] ? DEMO_EXTRACT[req.field.key] : local;
  }
  return ok(result);
});
