import { AI_CALL_LIMIT } from '../constants';
import { getDb } from './db';
import { fail } from './http';

export async function useAiCall(appId: string): Promise<void> {
  const db = getDb();
  for (;;) {
    const { data, error } = await db.from('application').select('ai_call_count').eq('id', appId).maybeSingle();
    if (error) throw error;
    if (!data) throw fail(404, 'app', '신청 내용을 찾을 수 없어요.');
    const count = data.ai_call_count;
    if (count >= AI_CALL_LIMIT) {
      throw fail(429, 'limit', '오늘은 말로 대답하기를 많이 썼어요. 버튼으로 대답해 주세요.');
    }
    const updated = await db.from('application').update({ ai_call_count: count + 1 })
      .eq('id', appId).eq('ai_call_count', count).select('id').maybeSingle();
    if (updated.error) throw updated.error;
    if (updated.data) return;
  }
}
