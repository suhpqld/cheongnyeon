'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnswerArea } from '@/components/question/AnswerArea';
import { ClarifyPanel } from '@/components/question/ClarifyPanel';
import { ProgressBar } from '@/components/question/ProgressBar';
import { UnknownGuide } from '@/components/question/UnknownGuide';
import { VoiceConfirm } from '@/components/question/VoiceConfirm';
import { DiscoveryCard } from '@/components/fill/DiscoveryCard';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Loading } from '@/components/ui/Loading';
import { MicButton } from '@/components/voice/MicButton';
import { apiFetch, ApiError } from '@/lib/client/api';
import { displayAnswer, formatWon } from '@/lib/format';
import { getSession } from '@/lib/client/session';
import { visibleFields } from '@/lib/rules/condition';
import { nextField, prevField, progress, questionText, validateAnswer } from '@/lib/rules/form';
import type { DiscoveryResult } from '@/lib/rules/discovery';
import type { Answer, AnswerMap, Application, ExtractResult, FormField, HelperMode, Program } from '@/lib/types';

type FormResponse = { program: Program | null; fields: FormField[]; answers: AnswerMap };
type AppResponse = { app: Application; program: Program | null };
type ViewState = 'question' | 'unknown' | 'approximate' | 'confirm' | 'clarify';

export default function Page() {
  return <Suspense fallback={<Loading text="질문을 준비하고 있어요" />}><FillQuestionScreen /></Suspense>;
}

function FillQuestionScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [app, setApp] = useState<Application | null>(null);
  const [form, setForm] = useState<FormResponse | null>(null);
  const [state, setState] = useState<ViewState>('question');
  const [voiceResult, setVoiceResult] = useState<{ result: ExtractResult; utterance: string } | null>(null);
  const [clarifyCount, setClarifyCount] = useState(0);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session || session.appId !== id) return;
    let active = true;
    Promise.all([
      apiFetch<AppResponse>(`/api/apps/${encodeURIComponent(id)}`),
      apiFetch<FormResponse>(`/api/apps/${encodeURIComponent(id)}/form`),
    ]).then(([appResponse, formResponse]) => {
      if (!active) return;
      setApp(appResponse.app);
      setForm(formResponse);
    }).catch((cause) => {
      if (active) setError(cause instanceof ApiError ? cause.message : '질문을 불러오지 못했어요.');
    });
    return () => { active = false; };
  }, [id]);

  const field = useMemo(() => form ? nextField(form.fields, form.answers) : null, [form]);

  const saveAnswer = useCallback(async (answersToSave: Answer[], continueAfterSave = true) => {
    if (!form || !field) return;
    setError('');
    try {
      const response = await apiFetch<{ answers: AnswerMap } & DiscoveryResult>(`/api/apps/${encodeURIComponent(id)}/answers`, {
        method: 'PUT',
        body: { answers: answersToSave },
      });
      setForm((current) => current ? { ...current, answers: response.answers } : current);
      setState('question');
      setVoiceResult(null);
      if (response.newlyRequiredDocs.length || response.newChecks.length || response.newPrechecks.length) {
        setDiscovery({ newlyRequiredDocs: response.newlyRequiredDocs, newChecks: response.newChecks, newPrechecks: response.newPrechecks });
        return;
      }
      if (continueAfterSave) {
        const upcoming = nextField(form.fields, response.answers);
        if (upcoming) router.push(`/a/${encodeURIComponent(id)}/fill`);
        else router.push(`/a/${encodeURIComponent(id)}/ready`);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '인터넷이 잠깐 끊겼어요. 답을 저장하지 못했어요.');
    }
  }, [field, form, id, router]);

  if (!mounted) return <Loading text="질문을 준비하고 있어요" />;
  if (!getSession() || getSession()?.appId !== id) return <AppShell back={{ href: '/resume' }} todo="이어서 하기 번호를 넣어 주세요"><div className="grid gap-3"><h1>이어서 하기 번호를 넣어 주세요</h1><BigButton href="/resume">이어서 하기</BigButton></div></AppShell>;
  if (error && !form) return <AppShell back={{ href: '/' }} todo="잠시 뒤 다시 시도해 주세요"><p role="alert">{error}</p></AppShell>;
  if (!form || !app || !field) return <Loading text="질문을 준비하고 있어요" />;

  const activeField = field;
  const activeForm = form;
  const currentAnswer = form.answers[activeField.key];
  const helperMode = app.helperMode as HelperMode;
  const fieldProgress = progress(form.fields, form.answers, activeField.key);
  const answeredCount = visibleFields(form.fields, form.answers).filter((item) => form.answers[item.key]).length;
  const backField = prevField(form.fields, form.answers, activeField.key);
  const readText = `${activeField.label}. ${questionText(activeField, helperMode)}${activeField.helpEasy ? ` ${activeField.helpEasy}` : ''}`;

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

  const continueAfterDiscovery = () => {
    setDiscovery(null);
    const upcoming = nextField(activeForm.fields, activeForm.answers);
    if (upcoming) router.push(`/a/${encodeURIComponent(id)}/fill`);
    else router.push(`/a/${encodeURIComponent(id)}/ready`);
  };

  return <AppShell back={{ href: backField ? `/a/${encodeURIComponent(id)}/fill` : `/a/${encodeURIComponent(id)}` }} resumeCode={app.resumeCode} todo="신청서 칸을 채워 주세요" speakText={state === 'question' || state === 'approximate' ? readText : null}>
    <div className="grid gap-3">
      <ProgressBar {...fieldProgress} />
      <div className="flex items-center justify-between rounded-xl bg-primary-soft px-3 py-2 text-sm font-bold">
        <span>신청서 {answeredCount}칸 채웠어요</span>
        <span>④ 새로 발견 {discovery ? discovery.newlyRequiredDocs.length + discovery.newChecks.length + discovery.newPrechecks.length : 0}개</span>
      </div>
      {discovery && <DiscoveryCard {...discovery} onContinue={continueAfterDiscovery} />}
      {(helperMode === 'family' || helperMode === 'helper') && <p className="rounded-xl bg-primary-soft p-3">👂 신청하시는 분께 읽어 드리고 같이 대답해 주세요.</p>}
      <p className="text-sm font-bold text-slate-600">신청서의 <strong>{activeField.label}</strong> 칸이에요</p>
      {state === 'unknown' ? <UnknownGuide checkGuide={activeField.checkGuide} isMoney={activeField.type === 'money'} onUnknown={() => selectButton('unknown')} onApproximate={() => setState('approximate')} onBack={() => setState('question')} /> : state === 'confirm' && voiceResult ? <VoiceConfirm confirmLabel={activeField.confirmLabel ?? activeField.label} displayValue={activeField.type === 'money' && typeof voiceResult.result.value === 'number' ? formatWon(voiceResult.result.value) : voiceResult.result.heardAs} utterance={voiceResult.utterance} isApproximate={voiceResult.result.isApproximate} onConfirm={confirmVoice} onRetry={() => setState('question')} onEdit={() => setState('question')} /> : state === 'clarify' && voiceResult ? <ClarifyPanel question={voiceResult.result.clarifyQuestion ?? `${questionText(activeField, helperMode)} 다시 대답해 주세요.`} utterance={voiceResult.utterance} options={clarifyOptions()} onSelect={(value) => { if (clarifyCount >= 2) setState('question'); else selectButton(value); }} onRetry={() => setState('question')} /> : <>
        <Boknyang mood={state === 'approximate' ? 'thinking' : 'idle'} size="sm" />
        <h1>{questionText(activeField, helperMode)}</h1>
        {activeField.helpEasy && <p>{activeField.helpEasy}</p>}
        <AnswerArea field={activeField} value={currentAnswer?.value} onAnswer={(value) => selectButton(value, state === 'approximate')} />
        <MicButton appId={id} helperMode={helperMode} field={activeField} otherFields={form.fields.filter((item) => item.key !== activeField.key)} clarify={null} onResult={onVoiceResult} />
        {activeField.allowUnknown && state === 'question' && <BigButton variant="secondary" onClick={() => setState('unknown')}>잘 모르겠어요</BigButton>}
      </>}
      {state === 'question' && currentAnswer && <p className="text-sm">현재 답: {displayAnswer(activeField, currentAnswer)}</p>}
      {error && <p role="alert" className="text-warn">{error}</p>}
    </div>
  </AppShell>;
}
