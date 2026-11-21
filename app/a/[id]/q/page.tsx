'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnswerArea } from '@/components/question/AnswerArea';
import { ClarifyPanel } from '@/components/question/ClarifyPanel';
import { ProgressBar } from '@/components/question/ProgressBar';
import { UnknownGuide } from '@/components/question/UnknownGuide';
import { VoiceConfirm } from '@/components/question/VoiceConfirm';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Loading } from '@/components/ui/Loading';
import { MicButton } from '@/components/voice/MicButton';
import { apiFetch, ApiError } from '@/lib/client/api';
import { STORAGE_KEYS } from '@/lib/constants';
import { displayAnswer, formatWon } from '@/lib/format';
import { getSession } from '@/lib/client/session';
import { nextField, prevField, progress, questionText, validateAnswer } from '@/lib/rules/form';
import type { Answer, AnswerMap, Application, ExtractResult, FormField, HelperMode, Program } from '@/lib/types';

type FormResponse = { program: Program | null; fields: FormField[]; answers: AnswerMap };
type AppResponse = { app: Application; program: Program | null };
type ViewState = 'question' | 'unknown' | 'approximate' | 'confirm' | 'clarify';

export default function Page() {
  return <Suspense fallback={<Loading text="질문을 준비하고 있어요" />}><QuestionScreen /></Suspense>;
}

function QuestionScreen() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const queryField = searchParams.get('field');
  const fromReview = searchParams.get('from') === 'review';
  const [app, setApp] = useState<Application | null>(null);
  const [form, setForm] = useState<FormResponse | null>(null);
  const [state, setState] = useState<ViewState>('question');
  const [voiceResult, setVoiceResult] = useState<{ result: ExtractResult; utterance: string } | null>(null);
  const [clarifyCount, setClarifyCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session || session.appId !== id) return;
    let active = true;
    Promise.all([apiFetch<AppResponse>(`/api/apps/${encodeURIComponent(id)}`), apiFetch<FormResponse>(`/api/apps/${encodeURIComponent(id)}/form`)]).then(([appResponse, formResponse]) => {
      if (!active) return;
      setApp(appResponse.app);
      setForm(formResponse);
    }).catch((cause) => {
      if (active) setError(cause instanceof ApiError ? cause.message : '질문을 불러오지 못했어요.');
    });
    return () => { active = false; };
  }, [id]);

  const field = useMemo(() => {
    if (!form) return null;
    const selected = queryField ? form.fields.find((item) => item.key === queryField) : undefined;
    return selected ?? nextField(form.fields, form.answers);
  }, [form, queryField]);

  useEffect(() => {
    if (form && !field && state === 'question') router.replace(`/a/${encodeURIComponent(id)}/review`);
  }, [field, form, id, router, state]);

  const saveAnswer = useCallback(async (answersToSave: Answer[], continueAfterSave = true) => {
    if (!form || !field) return;
    setError('');
    try {
      const response = await apiFetch<{ answers: AnswerMap }>(`/api/apps/${encodeURIComponent(id)}/answers`, { method: 'PUT', body: { answers: answersToSave } });
      setForm((current) => current ? { ...current, answers: response.answers } : current);
      setState('question');
      setVoiceResult(null);
      if (continueAfterSave) {
        const upcoming = nextField(form.fields, response.answers);
        if (fromReview) router.push(upcoming ? `/a/${encodeURIComponent(id)}/q?field=${encodeURIComponent(upcoming.key)}&from=review` : `/a/${encodeURIComponent(id)}/review`);
        else if (upcoming) router.push(`/a/${encodeURIComponent(id)}/q?field=${encodeURIComponent(upcoming.key)}`);
        else router.push(`/a/${encodeURIComponent(id)}/review`);
      }
    } catch (cause) {
      localStorage.setItem(STORAGE_KEYS.backup(id), JSON.stringify(answersToSave));
      setError(cause instanceof ApiError ? cause.message : '인터넷이 잠깐 끊겼어요. 답은 이 폰에 저장해 뒀어요.');
      if (continueAfterSave) router.push(`/a/${encodeURIComponent(id)}/review`);
    }
  }, [field, form, fromReview, id, router]);

  if (!getSession() || getSession()?.appId !== id) return <AppShell back={{ href: '/resume' }} todo="이어서 하기 번호를 넣어 주세요"><div className="grid gap-3"><h1>이어서 하기 번호를 넣어 주세요</h1><BigButton href="/resume">이어서 하기</BigButton></div></AppShell>;
  if (error && !form) return <AppShell back={{ href: '/' }} todo="잠시 뒤 다시 시도해 주세요"><p role="alert">{error}</p></AppShell>;
  if (!form || !app || !field) return <Loading text="질문을 준비하고 있어요" />;

  const activeForm = form;
  const activeApp = app;
  const activeField = field;
  const currentAnswer = activeForm.answers[activeField.key];
  const helperMode = activeApp.helperMode as HelperMode;
  const fieldProgress = progress(activeForm.fields, activeForm.answers, activeField.key);
  const backField = prevField(activeForm.fields, activeForm.answers, activeField.key);
  const backHref = fromReview ? `/a/${encodeURIComponent(id)}/review` : backField ? `/a/${encodeURIComponent(id)}/q?field=${encodeURIComponent(backField.key)}` : `/a/${encodeURIComponent(id)}`;
  const readText = `${questionText(activeField, helperMode)}${activeField.helpEasy ? ` ${activeField.helpEasy}` : ''}`;

  function selectButton(value: Answer['value'], isApproximate = false) {
    void saveAnswer([{ fieldKey: activeField.key, value, inputMethod: 'button', rawSpeech: null, isApproximate }]);
  }

  function onVoiceResult(result: ExtractResult, utterance: string) {
    if (result.value === null || result.confidence === 'low' || !validateAnswer(activeField, result.value)) {
      setVoiceResult({ result, utterance });
      setClarifyCount((count) => count + 1);
      setState('clarify');
      return;
    }
    if (result.value === 'unknown') { setState('unknown'); return; }
    if (activeField.type === 'money' || activeField.type === 'count' || activeField.type === 'district' || activeField.type === 'text') {
      setVoiceResult({ result, utterance });
      setState('confirm');
      return;
    }
    void saveAnswer([{ fieldKey: activeField.key, value: result.value, inputMethod: 'voice', rawSpeech: utterance, isApproximate: result.isApproximate }]);
  }

  function confirmVoice() {
    if (!voiceResult || voiceResult.result.value === null) return;
    const related = voiceResult.result.otherValues.filter((item) => {
      const relatedField = activeForm.fields.find((candidate) => candidate.key === item.key);
      return relatedField && validateAnswer(relatedField, item.value);
    }).map((item) => ({ fieldKey: item.key, value: item.value, inputMethod: 'voice' as const, rawSpeech: voiceResult.utterance, isApproximate: item.isApproximate }));
    void saveAnswer([{ fieldKey: activeField.key, value: voiceResult.result.value, inputMethod: 'voice', rawSpeech: voiceResult.utterance, isApproximate: voiceResult.result.isApproximate }, ...related]);
  }

  function clarifyOptions() {
    if (voiceResult?.result.clarifyOptions) return voiceResult.result.clarifyOptions;
    if (activeField.type === 'yes_no') return [{ label: '예', value: true }, { label: '아니오', value: false }];
    return undefined;
  }

  return <AppShell back={{ href: backHref }} resumeCode={activeApp.resumeCode} todo={state === 'question' || state === 'approximate' ? '질문에 대답해 주세요' : undefined} speakText={state === 'question' || state === 'approximate' ? readText : null}>
    <div className="grid gap-3">
      <ProgressBar {...fieldProgress} />
      {(helperMode === 'family' || helperMode === 'helper') && <p className="rounded-xl bg-primary-soft p-3">👂 신청하시는 분께 읽어 드리고 같이 대답해 주세요.</p>}
      {state === 'unknown' ? <UnknownGuide checkGuide={activeField.checkGuide} isMoney={activeField.type === 'money'} onUnknown={() => selectButton('unknown')} onApproximate={() => setState('approximate')} onBack={() => setState('question')} /> : state === 'confirm' && voiceResult ? <VoiceConfirm confirmLabel={activeField.confirmLabel ?? activeField.label} displayValue={activeField.type === 'money' && typeof voiceResult.result.value === 'number' ? formatWon(voiceResult.result.value) : voiceResult.result.heardAs} utterance={voiceResult.utterance} isApproximate={voiceResult.result.isApproximate} onConfirm={confirmVoice} onRetry={() => setState('question')} onEdit={() => setState('question')} /> : state === 'clarify' && voiceResult ? <ClarifyPanel question={voiceResult.result.clarifyQuestion ?? `${questionText(activeField, helperMode)} 다시 대답해 주세요.`} utterance={voiceResult.utterance} options={clarifyOptions()} onSelect={(value) => { if (clarifyCount >= 2) setState('question'); else selectButton(value); }} onRetry={() => setState('question')} /> : <>
        <Boknyang mood={state === 'approximate' ? 'thinking' : 'idle'} size="sm" />
        <h1>{questionText(activeField, helperMode)}</h1>
        {activeField.helpEasy && <p>{activeField.helpEasy}</p>}
        <AnswerArea field={activeField} value={currentAnswer?.value} onAnswer={(value) => selectButton(value, state === 'approximate')} />
        <MicButton appId={id} helperMode={helperMode} field={activeField} otherFields={activeForm.fields.filter((item) => item.key !== activeField.key)} clarify={null} onResult={onVoiceResult} />
        {activeField.allowUnknown && state === 'question' && <BigButton variant="secondary" onClick={() => setState('unknown')}>잘 모르겠어요</BigButton>}
        {error && <p role="alert" className="text-warn">{error}</p>}
      </>}
      {state === 'question' && currentAnswer && <p className="text-sm">현재 답: {displayAnswer(activeField, currentAnswer)}</p>}
    </div>
  </AppShell>;
}
