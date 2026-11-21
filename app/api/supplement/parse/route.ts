import { z } from 'zod';
import { SUPPLEMENT_SYSTEM_PROMPT, supplementUserPrompt } from '@/lib/ai/supplement-prompt';
import { supplementParsedSchema, validDate } from '@/lib/ai/supplement-schema';
import { sampleNoticeResult, sampleNoticeText } from '@/lib/demo/sample-notice';
import { callAI } from '@/lib/server/ai';
import { useAiCall } from '@/lib/server/ai-limit';
import { requireApp } from '@/lib/server/auth';
import { fail, ok, withErrors } from '@/lib/server/http';

export const maxDuration = 60;

const bodySchema = z.object({
  appId: z.string().uuid(),
  imageDataUrl: z.string().max(4_000_000).optional(),
  text: z.string().trim().min(1).max(20_000).optional(),
  today: z.iso.date(),
}).refine(value => Boolean(value.imageDataUrl) !== Boolean(value.text));

export const POST = withErrors(async (request: Request) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !validDate(body.data.today)) return fail(400, 'invalid', '사진이나 글을 확인해 주세요.');
  const { appId, imageDataUrl, text, today } = body.data;
  await requireApp(request, appId);
  await useAiCall(appId);

  let parsed;
  if (text === sampleNoticeText(today)) {
    parsed = sampleNoticeResult(today);
  } else {
    try {
      const answer = await callAI({
        kind: imageDataUrl ? 'vision' : 'text',
        system: SUPPLEMENT_SYSTEM_PROMPT,
        user: supplementUserPrompt(today, text),
        imageDataUrl,
        timeoutMs: 45_000,
      });
      parsed = supplementParsedSchema.parse(answer);
    } catch {
      if (process.env.DEMO_MODE !== 'true') return fail(422, 'unreadable', '글씨를 잘 못 읽었어요.');
      parsed = sampleNoticeResult(today);
    }
  }
  const checked = supplementParsedSchema.parse(parsed);
  if (!checked.items.length) return fail(422, 'unreadable', '글씨를 잘 못 읽었어요.');
  return ok({ ...checked, deadline: validDate(checked.deadline) ? checked.deadline : null });
});
