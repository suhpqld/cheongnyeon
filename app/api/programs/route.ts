import { getDb } from '@/lib/server/db';
import { ok, withErrors } from '@/lib/server/http';

export type ProgramStatus = 'available' | 'soon';

export interface ProgramListItem {
  code: string;
  name: string;
  status: ProgramStatus;
  summaryEasy: string | null;
}

// GET /api/programs → 복지 목록 (sort_order 순, status 포함). 토큰 없음
export const GET = withErrors(async () => {
  const { data, error } = await getDb()
    .from('welfare_program')
    .select('code, name, status, sort_order, summary_easy')
    .order('sort_order')
    .order('name');
  if (error) throw error;
  const programs: ProgramListItem[] = (data ?? []).map((r) => ({
    code: r.code as string,
    name: r.name as string,
    status: r.status === 'available' ? 'available' : 'soon',
    summaryEasy: (r.summary_easy as string | null) ?? null,
  }));
  return ok({ programs });
});
