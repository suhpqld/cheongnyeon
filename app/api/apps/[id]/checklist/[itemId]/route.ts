import { z } from 'zod';
import { requireApp } from '@/lib/server/auth';
import { getDb, toCamel } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { ChecklistItem } from '@/lib/types';

const requestBody = z.object({ isDone: z.boolean() });

// 🔒 PATCH /api/apps/[id]/checklist/[itemId]  { isDone }
export const PATCH = withErrors(
  async (request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) => {
    const { id, itemId } = await params;
    const row = await requireApp(request, id);
    const body = requestBody.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail(400, 'invalid', '챙겼는지 다시 눌러 주세요.');

    const { data, error } = await getDb()
      .from('checklist_item')
      .update({ is_done: body.data.isDone })
      .eq('id', itemId)
      .eq('application_id', row.id)
      .select('*')
      .maybeSingle();
    if (error && error.code !== '22P02') throw error;
    if (!data) return fail(404, 'item', '서류를 찾을 수 없어요. 화면을 새로 열어 주세요.');
    return ok({ item: toCamel<ChecklistItem>(data) });
  },
);
