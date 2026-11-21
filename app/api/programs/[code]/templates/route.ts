import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';
import type { ProgramListItem } from '../../route';

export interface TemplateListItem {
  code: string;
  name: string;
  pageImages: string[];
  slotCount: number;
}

export interface ProgramTemplates {
  program: ProgramListItem;
  templates: TemplateListItem[];
}

// GET /api/programs/[code]/templates → 그 복지의 양식 목록 (그림, 칸 개수). 토큰 없음
export const GET = withErrors(async (_request: Request, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const db = getDb();
  const program = await db
    .from('welfare_program')
    .select('id, code, name, status, summary_easy')
    .eq('code', code)
    .maybeSingle();
  if (program.error) throw program.error;
  if (!program.data) return fail(404, 'program', '그 복지를 찾을 수 없어요.');

  const { data, error } = await db
    .from('form_template')
    .select('code, name, page_images, sort_order, form_slot(count)')
    .eq('program_id', program.data.id)
    .order('sort_order');
  if (error) throw error;

  const templates: TemplateListItem[] = (data ?? []).map((t) => {
    const images = Array.isArray(t.page_images) ? t.page_images : [];
    const count = Array.isArray(t.form_slot) ? Number((t.form_slot[0] as { count?: number } | undefined)?.count ?? 0) : 0;
    return {
      code: t.code as string,
      name: t.name as string,
      pageImages: images.filter((p): p is string => typeof p === 'string' && p.startsWith('/forms/')),
      slotCount: count,
    };
  });

  const p = program.data;
  return ok({
    program: {
      code: p.code as string,
      name: p.name as string,
      status: p.status === 'available' ? 'available' : 'soon',
      summaryEasy: (p.summary_easy as string | null) ?? null,
    },
    templates,
  } satisfies ProgramTemplates);
});
