import { CARD_SCRIPT_SYSTEM, cardScriptUserMessage, templateCardScript } from '@/lib/ai/card-script-prompt';
import { cardScriptRequestSchema, safeScript } from '@/lib/ai/card-script-schema';
import { DEMO_CARD_SCRIPT, isDemoMode } from '@/lib/ai/demo-responses';
import { callAI } from '@/lib/server/ai';
import { useAiCall } from '@/lib/server/ai-limit';
import { requireApp } from '@/lib/server/auth';
import { fail, ok, withErrors } from '@/lib/server/http';

export const maxDuration = 30;

// 🔒 POST /api/card-script  CardScriptRequest → { script }
export const POST = withErrors(async (request: Request) => {
  const body = cardScriptRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, 'invalid', '할 말 재료를 확인해 주세요.');
  const req = body.data;
  await requireApp(request, req.appId);
  await useAiCall(req.appId);

  try {
    const raw = await callAI({ kind: 'text', system: CARD_SCRIPT_SYSTEM, user: cardScriptUserMessage(req), timeoutMs: 15_000 });
    const script = safeScript(raw);
    if (script) return ok({ script });
  } catch {
    // AI 실패 → 아래 틀 문장
  }
  // 시연 페르소나와 같은 답일 때만 준비된 문장 (다른 사람에게 틀린 사실을 말하지 않게)
  const lines = req.answerLines.join(' ');
  const isPersonaDemo =
    isDemoMode() && req.applicantType === 'family' && req.supplementItems.length === 0 &&
    /1명 \(혼자\)/.test(lines) && /25만 원/.test(lines);
  return ok({ script: isPersonaDemo ? DEMO_CARD_SCRIPT : templateCardScript(req) });
});
