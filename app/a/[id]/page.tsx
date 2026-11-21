'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { ShareButton } from '@/components/share/ShareButton';
import { NextActions } from '@/components/status/NextActions';
import { StageTracker } from '@/components/status/StageTracker';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { ApiError, apiFetch } from '@/lib/client/api';
import type { Progress } from '@/lib/rules/progress';

type Props = { params: Promise<{ id: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<AppShell back={{ href: '/' }}><Loading text="신청 현황을 불러오고 있어요" /></AppShell>}>
    <Screen {...props} />
  </Suspense>;
}

function Screen({ params }: Props) {
  const { id } = use(params);
  return <ApplicationProgress key={id} id={id} />;
}

function ApplicationProgress({ id }: { id: string }) {
  const base = '/a/' + encodeURIComponent(id);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [request, setRequest] = useState(0);
  const [error, setError] = useState<{ message: string; resume: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Progress>('/api/apps/' + encodeURIComponent(id) + '/progress')
      .then(data => { if (active) setProgress(data); })
      .catch(cause => {
        if (!active) return;
        const resume = cause instanceof ApiError && (cause.status === 401 || cause.status === 404);
        setError({
          resume,
          message: resume ? '이어서 하기 번호를 넣어 주세요.'
            : cause instanceof ApiError ? cause.message : '신청 현황을 불러오지 못했어요.',
        });
      });
    return () => { active = false; };
  }, [id, request]);

  function retry() {
    setError(null);
    setRequest(value => value + 1);
  }

  if (error || !progress) return (
    <AppShell back={{ href: '/' }}>
      <div className="grid gap-3">
        <h1>내 신청 현황</h1>
        {error ? <>
          <p role="alert">{error.message}</p>
          {error.resume ? <BigButton href="/resume">번호로 이어서 하기</BigButton>
            : <BigButton onClick={retry}>다시 불러오기</BigButton>}
        </> : <Loading text="신청 현황을 불러오고 있어요" />}
      </div>
    </AppShell>
  );

  const { app, programName, nextActions, docsReady, activeSupplement } = progress;
  const firstAction = nextActions[0]?.title;
  const canUseCard = app.status !== 'drafting';

  return (
    <AppShell back={{ href: '/' }} todo={firstAction} resumeCode={app.resumeCode}
      speakText={firstAction ? '다시 오셨네요. 지금 할 일이에요. ' + firstAction : '내 신청 현황이에요.'}>
      <div className="grid gap-5">
        <div>
          <p className="text-[0.9rem] font-bold">{programName}</p>
          <h1>내 신청 현황</h1>
        </div>
        <section className="grid gap-3" aria-labelledby="next-actions-title">
          <h2 id="next-actions-title">남은 일</h2>
          <NextActions actions={nextActions} />
        </section>
        <div className="flex items-center gap-3">
          <Boknyang size="sm" />
          <SpeechBubble>다시 오셨네요! 남은 일부터 하나씩 챙겨요.</SpeechBubble>
        </div>
        <section aria-labelledby="progress-title" className="grid gap-3">
          <h2 id="progress-title">신청 단계</h2>
          <StageTracker status={app.status} docsReady={docsReady} submittedAt={app.submittedAt}
            supplementDday={activeSupplement?.dday ?? null} />
          <ul className="grid gap-1 text-[max(18px,0.9rem)]">
            {progress.checklistTotal > 0 && <li>챙긴 서류 {progress.checklistDone} / {progress.checklistTotal}</li>}
            {progress.checkNeeded > 0 && <li>확인할 것 {progress.checkNeeded}개</li>}
            {progress.precheckPending > 0 && canUseCard && <li>내기 전 점검 {progress.precheckPending}개 남음</li>}
          </ul>
        </section>
        <section className="grid gap-3" aria-label="바로 가기">
          {canUseCard && <>
            <BigButton href={base + '/card'} variant="secondary" icon="📋">제출 준비 카드</BigButton>
            <BigButton href={base + '/print'} variant="secondary" icon="🖨">옮겨 쓰는 카드</BigButton>
          </>}
          {progress.remainingQuestions === 0 && <BigButton href={base + '/review'} variant="secondary" icon="📝">신청서 내용 보기</BigButton>}
          <ShareButton appId={id} />
        </section>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
