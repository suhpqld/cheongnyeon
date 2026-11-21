import { requireApp } from '@/lib/server/auth';
import { ok, withErrors } from '@/lib/server/http';
import { loadCardData, type CardData } from '../card/load';
import { computeRemaining, type Remaining } from './remaining';

export type ReadyData = CardData & { remaining: Remaining };

// 🔒 GET /api/apps/[id]/ready → 남은 것 목록과 개수 + 세 칸 탭 데이터 (04 카드 데이터)
export const GET = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const card = await loadCardData(row);
  return ok({ ...card, remaining: computeRemaining(card) } satisfies ReadyData);
});
