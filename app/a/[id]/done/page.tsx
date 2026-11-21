
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
import {
  displaySeoulDate,
  type Progress,
} from '@/lib/rules/progress';
import type { Program } from '@/lib/types';

type Props = {
  params: Promise<{ id: string }>;
};

type SubmittedResult = {
  progress: Progress;
  afterSubmit: string;
};

const celebration =
  '신청서가 접수됐다냥! 정말 수고 많으셨어요.';

const later =
  '추가 서류를 요청받으면 복냥이에서 필요한 서류와 제출 기한을 확인할 수 있어요.';

export default function Page(props: Props) {
  return (
    <Suspense
      fallback={
        <AppShell back={{ href: '/' }}>
          <Loading text="접수 상태를 확인하고 있어요" />
        </AppShell>
      }
    >
      <Screen {...props} />
    </Suspense>
  );
}

function Screen({ params }: Props) {
  const { id } = use(params);
  return <Submitted key={id} id={id} />;
}

function Submitted({ id }: { id: string }) {
  const router = useRouter();
  const base = '/a/' + encodeURIComponent(id);

  const [result, setResult] =
    useState<SubmittedResult | null>(null);

  const [error, setError] = useState<{
    message: string;
    resume: boolean;
  } | null>(null);

  // 신청 상태 및 복지제도 정보 불러오기
  useEffect(() => {
    let active = true;

    const path = '/api/apps/' + encodeURIComponent(id);

    Promise.all([
      apiFetch<Progress>(path + '/progress'),
      apiFetch<{ program: Program | null }>(path),
    ])
      .then(([progress, { program }]) => {
        if (!active) return;

        // 실제 접수 기록이 없는 경우 방문 확인으로 이동
        if (!progress.app.submittedAt) {
          router.replace(base + '/visit');
          return;
        }

        setResult({
          progress,
          afterSubmit:
            program?.afterSubmitEasy ??
            '담당 기관에서 신청 결과를 안내해 드려요.',
        });
      })
      .catch((cause) => {
        if (!active) return;

        const resume =
          cause instanceof ApiError &&
          (cause.status === 401 || cause.status === 404);

        setError({
          resume,
          message: resume
            ? '이어서 하기 번호를 넣어 주세요.'
            : '접수 상태를 확인하지 못했어요.',
        });
      });

    return () => {
      active = false;
    };
  }, [id, base, router]);

  if (
    error ||
    !result ||
    !result.progress.app.submittedAt
  ) {
    return (
      <AppShell back={{ href: base }}>
        {error ? (
          <div className="grid gap-3">
            <p role="alert" className="font-bold text-warn">
              {error.message}
            </p>

            <BigButton
              href={error.resume ? '/resume' : base}
            >
              {error.resume
                ? '번호로 이어서 하기'
                : '내 신청 현황'}
            </BigButton>
          </div>
        ) : (
          <Loading text="접수 상태를 확인하고 있어요" />
        )}
      </AppShell>
    );
  }

  const {
    app,
    docsReady,
    activeSupplement,
  } = result.progress;

  const needsSupplement =
    app.status === 'supplementing' ||
    Boolean(activeSupplement);

  const todo = needsSupplement
    ? '추가로 준비할 서류를 확인해 주세요'
    : '담당 기관의 심사 결과를 기다려 주세요';

  const speakText = [
    celebration,
    '신청서가 접수된 상태이며, 지원 대상으로 선정되었다는 뜻은 아니에요.',
    result.afterSubmit,
    later,
  ].join(' ');

  return (
    <AppShell
      back={{ href: base }}
      todo={todo}
      resumeCode={app.resumeCode}
      speakText={speakText}
    >
      <div className="grid gap-4">

        {/* 접수 완료 안내 */}
        <div className="grid justify-items-center gap-3 rounded-3xl border border-primary/15 bg-white p-4 text-center">
          <Boknyang size="lg" mood="happy" />

          <h1>신청서 접수 완료</h1>

          <p className="font-bold">
            {celebration}
          </p>

          <p className="w-full rounded-xl bg-primary-soft p-3 font-bold">
            접수일: {app.submittedAt ? displaySeoulDate(app.submittedAt) : '확인 중'}
          </p>
        </div>

        {/* 접수와 선정 결과 구분 */}
        <div className="grid gap-2 rounded-xl border border-primary/15 bg-primary-soft p-4">
          <h2 className="font-bold">
            접수는 완료됐어요!
          </h2>

          <p>
            신청서가 접수된 상태예요.
            실제 지원 대상 선정 여부는
            담당 기관의 심사를 거쳐 결정돼요.
          </p>
        </div>

        {/* 기존 진행 상태 컴포넌트 재사용 */}
        <StageTracker
          status={app.status}
          docsReady={docsReady}
          submittedAt={app.submittedAt}
          supplementDday={
            activeSupplement?.dday ?? null
          }
        />

        {/* 접수 이후 안내 */}
        <div className="grid gap-2">
          <h2 className="font-bold">
            이제 무엇을 하면 되나요?
          </h2>

          <p>{result.afterSubmit}</p>

          {needsSupplement ? (
            <p className="font-bold text-warn">
              추가로 요청된 서류가 있어요.
              필요한 서류와 기한을 확인해 주세요.
            </p>
          ) : (
            <p>
              심사 과정에서 추가 자료를
              요청받을 수도 있어요.
            </p>
          )}
        </div>

        {/* 추가서류 연결 */}
        <BigButton
          href={base + '/extra'}
          variant="secondary"
          icon="📮"
          sub="추가 서류 요청서를 확인하고 준비해요"
        >
          서류를 더 내래요
        </BigButton>

        {/* 진행 상황 공유 */}
        <ShareButton appId={id} />

        {/* 기존 신청 정보 확인 */}
        <BigButton
          href={base}
          variant="secondary"
        >
          내 신청 현황 확인하기
        </BigButton>

        <BigButton href="/">
          처음으로
        </BigButton>

        <Disclaimer />
      </div>
    </AppShell>
  );
}
