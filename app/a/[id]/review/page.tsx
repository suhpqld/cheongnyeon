'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReviewRow } from '@/components/question/ReviewRow';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { SECTION_ORDER } from '@/lib/constants';
import { displayAnswer } from '@/lib/format';
import { getSession } from '@/lib/client/session';
import { checkNeeded, visibleFields } from '@/lib/rules/form';
import type { AnswerMap, Application, FormField } from '@/lib/types';

type FormResponse = { fields: FormField[]; answers: AnswerMap };
type AppResponse = { app: Application };

export default function Page() {
  return <Suspense fallback={<Loading text="확인 화면을 준비하고 있어요" />}><ReviewScreen /></Suspense>;
}

function ReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [form, setForm] = useState<FormResponse | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!getSession()?.appId || getSession()?.appId !== id) return;
    Promise.all([apiFetch<AppResponse>(`/api/apps/${encodeURIComponent(id)}`), apiFetch<FormResponse>(`/api/apps/${encodeURIComponent(id)}/form`)]).then(([appResponse, formResponse]) => {
      setApp(appResponse.app);
      setForm(formResponse);
    }).catch((cause) => setError(cause instanceof ApiError ? cause.message : '확인 화면을 불러오지 못했어요.'));
  }, [id]);

  const fields = useMemo(() => form ? visibleFields(form.fields, form.answers) : [], [form]);
  const needed = useMemo(() => form ? checkNeeded(form.fields, form.answers) : [], [form]);
  if (!getSession() || getSession()?.appId !== id) return <AppShell back={{ href: '/resume' }} todo="이어서 하기 번호를 넣어 주세요"><BigButton href="/resume">이어서 하기</BigButton></AppShell>;
  if (error) return <AppShell back={{ href: `/a/${encodeURIComponent(id)}/q` }} todo="잠시 뒤 다시 시도해 주세요"><p role="alert">{error}</p></AppShell>;
  if (!form || !app) return <Loading text="확인 화면을 준비하고 있어요" />;

  const activeForm = form;
  const activeApp = app;
  const lastField = [...fields].reverse().find((field) => activeForm.answers[field.key]);
  const missing = fields.find((field) => field.required && !activeForm.answers[field.key]);
  const backHref = lastField ? `/a/${encodeURIComponent(id)}/q?field=${encodeURIComponent(lastField.key)}&from=review` : `/a/${encodeURIComponent(id)}/q`;
  const grouped = SECTION_ORDER.map((section) => ({ section, fields: fields.filter((field) => field.section === section) })).filter((group) => group.fields.length);

  function readAll() {
    if (reading) { window.speechSynthesis?.cancel(); setReading(false); return; }
    setReading(true);
    const text = fields.map((field) => `${field.label}, ${displayAnswer(field, activeForm.answers[field.key])}`).join('. ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.onend = () => setReading(false);
    utterance.onerror = () => setReading(false);
    window.speechSynthesis?.speak(utterance);
  }

  async function next() {
    if (missing) {
      router.push(`/a/${encodeURIComponent(id)}/q?field=${encodeURIComponent(missing.key)}&from=review`);
      return;
    }
    try {
      if (activeApp.status === 'drafting') await apiFetch(`/api/apps/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status: 'preparing' } });
      router.push(`/a/${encodeURIComponent(id)}/precheck`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '다음 단계로 넘어가지 못했어요.');
    }
  }

  return <AppShell back={{ href: backHref }} resumeCode={activeApp.resumeCode} todo="틀린 곳이 없는지 확인해 주세요" speakText="신청서에 이렇게 적을게요. 틀린 곳이 있으면 그 줄의 고치기를 눌러 주세요.">
    <div className="grid gap-4">
      <h1>신청서에 이렇게 적을게요</h1>
      {needed.length > 0 && <div className="rounded-xl border-2 border-yellow-600 bg-yellow-50 p-4 font-bold">⚠ 확인이 필요한 답이 {needed.length}개 있어요. 주민센터에 가기 전에 확인하면 좋아요.</div>}
      <BigButton variant="secondary" onClick={readAll}>{reading ? '■ 멈추기' : '🔊 전체 읽어 주기'}</BigButton>
      {grouped.map(({ section, fields: sectionFields }) => <section key={section} className="grid gap-2"><h2>{section}</h2>{sectionFields.map((field) => <ReviewRow key={field.key} label={field.label} value={displayAnswer(field, activeForm.answers[field.key])} needsCheck={needed.some((item) => item.key === field.key)} onEdit={() => router.push(`/a/${encodeURIComponent(id)}/q?field=${encodeURIComponent(field.key)}&from=review`)} />)}</section>)}
      <BigButton onClick={next}>{missing ? '이것만 더 대답해 주세요' : '맞아요, 다음으로'}</BigButton>
      <Disclaimer />
    </div>
  </AppShell>;
}
