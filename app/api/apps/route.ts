import { z } from 'zod';
import { newResumeCode, newToken } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { fail, ok, withErrors } from '@/lib/server/http';

const requestBody = z.object({
  programCode: z.string().min(1),
  helperMode: z.enum(['self', 'family', 'helper']),
  startStatus: z.enum(['drafting', 'supplementing']).optional(),
});

export const POST = withErrors(async (request: Request) => {
  const body = requestBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, 'invalid', '신청을 시작할 정보를 확인해 주세요.');

  const { programCode, helperMode, startStatus = 'drafting' } = body.data;
  const db = getDb();
  const program = await db.from('welfare_program').select('id').eq('code', programCode).maybeSingle();
  if (program.error) throw program.error;
  if (!program.data) return fail(400, 'program', '신청할 제도를 찾을 수 없어요.');

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = newToken();
    const resumeCode = newResumeCode();
    const { data, error } = await db.from('application').insert({
      program_id: program.data.id, helper_mode: helperMode, status: startStatus,
      app_token: token, resume_code: resumeCode,
    }).select('id').single();
    if (!error) return ok({ appId: data.id, token, resumeCode }, 201);
    if (error.code !== '23505') throw error;
  }
  return fail(503, 'resume_code', '이어서 하기 번호를 만들지 못했어요. 다시 시도해 주세요.');
})
