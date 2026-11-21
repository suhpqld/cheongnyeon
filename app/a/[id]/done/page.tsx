'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShareButton } from '@/components/share/ShareButton';
import { StageTracker } from '@/components/status/StageTracker';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { ApiError, apiFetch } from '@/lib/client/api';
import { displaySeoulDate, type Progress } from '@/lib/rules/progress';
import type { Program } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };
const celebration = '주민센터에 냈다냥! 정말 수고 많으셨어요.';
const later = '중간에 서류를 더 내라는 연락이 오면 복냥이를 열고 서류를 더 내래요를 누르세요.';

export default function Page(props: Props) {
  return <Suspense fallback={<AppShell back={{ href: '/' }}><Loading text="제출 상태를 확인하고 있어요" /></AppShell>}>
    <Screen {...props} />
  </Suspense>;
}

function Screen({ params }: Props) {
  const { id } = use(params);
  return <Submitted key={id} id={id} />;
}

function Submitted({ id }: { id: string }) {
  const router = useRouter();
  const base = '/a/' + encodeURIComponent(id);
  const [result, setResult] = useState<{ progress: Progress; afterSubmit: string } | null>(null);
  const [error, setError] = useState<{ message: string; resume: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const path = '/api/apps/' + encodeURIComponent(id);
    Promise.all([apiFetch<Progress>(path + '/progress'), apiFetch<{ program: Program | null }>(path)])
      .then(([progress, { program }]) => {
        if (!active) return;
        if (!progress.app.submittedAt) router.replace(base + '/visit');
        else setResult({ progress, afterSubmit: program?.afterSubmitEasy ?? '구청에서 결과를 알려 줘요.' });
      })
      .catch(cause => {
        if (!active) return;
        const resume = cause instanceof ApiError && (cause.status === 401 || cause.status === 404);
        setError({ resume, message: resume ? '이어서 하기 번호를 넣어 주세요.' : '제출 상태를 확인하지 못했어요.' });
      });
    return () => { active = false; };
  }, [id, base, router]);

  if (error || !result || !result.progress.app.submittedAt) return (
    <AppShell back={{ href: base }}>
      {error ? <div className="grid gap-3">
        <p role="alert">{error.message}</p>
        <BigButton href={error.resume ? '/resume' : base}>{error.resume ? '번호로 이어서 하기' : '내 신청 현황'}</BigButton>
      </div> : <Loading text="제출 상태를 확인하고 있어요" />}
    </AppShell>
  );

  const { app, docsReady, activeSupplement } = result.progress;
  const todo = app.status === 'supplementing' || activeSupplement
    ? '추가로 챙길 서류를 확인해 주세요' : '이제 결과를 기다리면 돼요';

  return (
    <AppShell back={{ href: base }} todo={todo} resumeCode={app.resumeCode}
      speakText={celebration + ' ' + result.afterSubmit + ' ' + later}>
      <div className="grid gap-4">
        <div className="grid justify-items-center gap-3 rounded-3xl border border-primary/15 bg-white p-4 text-center">
          <Boknyang size="lg" mood="happy" />
          <h1>주민센터 제출 완료</h1>
          <p className="font-bold">{celebration}</p>
          <p className="w-full rounded-xl bg-primary-soft p-2 font-bold">
            제출 완료: {displaySeoulDate(result.progress.app.submittedAt)}
          </p>
        </div>
        <StageTracker status={app.status} docsReady={docsReady} submittedAt={app.submittedAt}
          supplementDday={activeSupplement?.dday ?? null} />
        <p>{result.afterSubmit}</p>
        <p>{later}</p>
        <ShareButton appId={id} />
        <BigButton href={base + '/photo'} variant="secondary" icon="📮">서류를 더 내래요</BigButton>
        <BigButton href={base} variant="secondary">내 신청 현황</BigButton>
        <BigButton href="/">처음으로</BigButton>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
