import { requireApp } from '@/lib/server/auth';
import { ok, withErrors } from '@/lib/server/http';
import { loadCardData } from './load';

// 🔒 GET /api/apps/[id]/card  (?include=print 이면 옮겨 쓰는 카드 표도 같이)
export const GET = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  const includePrint = new URL(request.url).searchParams.get('include') === 'print';
  return ok(await loadCardData(row, { includePrint }));
});
