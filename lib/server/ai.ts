import 'server-only';

type AiErrorCode = 'key' | 'billing' | 'timeout' | 'json' | 'http' | 'image';

export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
    this.name = 'AiError';
  }
}

interface AiOptions {
  kind: 'text' | 'vision';
  system: string;
  user: string;
  imageDataUrl?: string;
  timeoutMs?: number;
}

export async function callAI({ kind, system, user, imageDataUrl, timeoutMs = 25_000 }: AiOptions): Promise<unknown> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError('key');
  const vision = kind === 'vision';
  const model = vision
    ? process.env.CLAUDE_VISION_MODEL || 'claude-sonnet-5-5'
    : process.env.CLAUDE_TEXT_MODEL || 'claude-haiku-5-5';
  const content: object[] = [];
  if (vision && imageDataUrl) {
    const image = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
    if (!image) throw new AiError('image');
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image[1] } });
  }
  content.push({ type: 'text', text: user });
  const messages: { role: 'user' | 'assistant'; content: object[] | string }[] = [{ role: 'user', content }];
  let retriedHttp = false;

  async function request(): Promise<string> {
    for (;;) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': key!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: vision ? 2048 : 1024, temperature: 0, system, messages }),
          signal: controller.signal,
        });
        if ((response.status === 429 || response.status >= 500) && !retriedHttp) {
          retriedHttp = true;
          await response.body?.cancel();
        } else {
          if (response.status === 401) throw new AiError('key');
          if (response.status === 400 && /credit/i.test(await response.text())) throw new AiError('billing');
          if (!response.ok) throw new AiError('http');
          const data = await response.json() as { content: { type: string; text?: string }[] };
          return data.content.filter(block => block.type === 'text').map(block => block.text ?? '').join('');
        }
      } catch (error) {
        if (controller.signal.aborted) throw new AiError('timeout');
        if (error instanceof AiError) throw error;
        throw new AiError('http');
      } finally {
        clearTimeout(timer);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await request();
    const cleaned = reply.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Ask for one corrected response below.
      }
    }
    if (attempt === 0) {
      messages.push({ role: 'assistant', content: reply || '(빈 응답)' });
      messages.push({ role: 'user', content: 'JSON 하나만 다시 보내 주세요' });
    }
  }
  throw new AiError('json');
}
