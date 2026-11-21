import type { Program } from '@/lib/types';
import { publicApp, requireApp } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { ok, withErrors } from '@/lib/server/http';

export const GET = withErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const row = await requireApp(request, id);
  let program: Program | null = null;
  if (row.program_id) {
    const { data, error } = await getDb().from('welfare_program')
      .select('id, code, name, summary_easy, apply_place, contact, after_submit_easy')
      .eq('id', row.program_id).maybeSingle();
    if (error) throw error;
    if (data) program = toCamel<Program>(data);
  }
  return ok({ app: publicApp(row), program });
});
