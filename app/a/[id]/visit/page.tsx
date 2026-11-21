
'use client';

import { Suspense, use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Loading } from '@/components/ui/Loading';
import { ApiError, apiFetch } from '@/lib/client/api';
import type { Progress } from '@/lib/rules/progress';

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page(props: Props) {
  return (
    <Suspense
      fallback={
        <AppShell back={{ href: '/' }}>
          <Loading text="신청 현황을 불러오고 있어요" />
        </AppShell>
      }
    >
      <Screen {...props} />
    </Suspense>
  );
}

function Screen({ params }: Props) {
  const { id } = use(params);
  return <Visit key={id} id={id} />;
}

function Visit({ id }: { id: string }) {
  const base = '/a/' + encodeURIComponent(id);
  const router = useRouter();

  const saving = useRef(false);

  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    href?: string;
    label?: string;
  } | null>(null);

  const [progress, setProgress] = useState<Progress | null>(null);

  // 기존 신청 진행 상황 불러오기
  useEffect(() => {
    let active = true;

    apiFetch<Progress>(
      '/api/apps/' + encodeURIComponent(id) + '/progress'
    )
      .then((data) => {
        if (active) setProgress(data);
      })
      .catch((cause) => {
        if (!active) return;

        const resume =
          cause instanceof ApiError &&
          [401, 404].includes(cause.status);

        setError(
          resume
            ? {
                message: '이어서 하기 번호를 넣어 주세요.',
                href: '/resume',
                label: '번호로 이어서 하기',
              }
            : {
                message: '신청 현황을 확인하지 못했어요.',
                href: base,
                label: '내 신청 현황',
              }
        );
      });

    return () => {
      active = false;
    };
  }, [id, base]);

  // 실제 주민센터 접수 완료 처리
  async function submit() {
    if (saving.current) return;

    saving.current = true;
    setBusy(true);
    setConfirmation(false);
    setError(null);

    try {
      await apiFetch(
        '/api/apps/' + encodeURIComponent(id) + '/status',
        {
          method: 'PATCH',
          body: { status: 'submitted' },
        }
      );

      // S7 접수 완료 화면
      router.replace(base + '/done');
    } catch (cause) {
      const status =
        cause instanceof ApiError ? cause.status : 0;

      if (status === 409) {
        setError({
          message: '신청서를 먼저 끝내 주세요.',
          href: base,
          label: '내 신청 현황',
        });
      } else if (status === 401 || status === 404) {
        setError({
          message: '이어서 하기 번호를 넣어 주세요.',
          href: '/resume',
          label: '번호로 이어서 하기',
        });
      } else {
        setError({
          message:
            cause instanceof ApiError
              ? cause.message
              : '접수 상태를 저장하지 못했어요.',
        });
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const remaining = Math.max(
    0,
    (progress?.checklistTotal ?? 0) -
      (progress?.checklistDone ?? 0)
  );

  return (
    <AppShell
      back={{ href: base + '/ready' }}
      todo="주민센터에 다녀온 결과를 알려 주세요"
      resumeCode={progress?.app.resumeCode}
      speakText="주민센터에 다녀오셨나요? 신청서가 접수됐다면 접수됐어요를, 추가 서류를 요청받았다면 서류를 더 내래요를 선택해 주세요."
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <h1>주민센터에 다녀오셨어요?</h1>

          <p>
            신청서와 준비한 서류를 제출한 뒤
            어떻게 진행됐는지 알려 주세요.
          </p>
        </div>

        {remaining > 0 && (
          <div className="rounded-xl bg-primary-soft p-4">
            <p className="font-bold">
              아직 확인하지 않은 서류가 {remaining}개 있어요.
            </p>
            <p>
              이미 주민센터에서 접수했다면
              실제 접수 결과에 맞게 선택해 주세요.
            </p>
          </div>
        )}

        {error && (
          <div className="grid gap-2">
            <p role="alert" className="font-bold text-warn">
              {error.message}
            </p>

            {error.href && (
              <BigButton
                href={error.href}
                variant="secondary"
              >
                {error.label}
              </BigButton>
            )}
          </div>
        )}

        {progress && (
          <div className="grid gap-3">
            <BigButton
              onClick={() => setConfirmation(true)}
              disabled={busy}
              icon="✅"
              sub="주민센터에서 실제로 접수됐어요"
            >
              {busy ? '저장하고 있어요' : '접수됐어요'}
            </BigButton>

            <BigButton
              href={base + '/extra'}
              variant="secondary"
              icon="📮"
              sub="추가 서류 요청을 받았어요"
            >
              서류를 더 내래요
            </BigButton>

            <BigButton
              href={base + '/ready'}
              variant="secondary"
            >
              아직 안 갔어요
            </BigButton>
          </div>
        )}

        {!progress && !error && (
          <Loading text="신청 현황을 확인하고 있어요" />
        )}
      </div>

      <ConfirmModal
        open={confirmation}
        title="주민센터에서 신청서가 접수됐나요?"
        body="실제로 접수가 완료된 경우에만 접수 완료로 표시해요. 신청 결과가 확정됐다는 뜻은 아니에요."
        confirmLabel="네, 접수됐어요"
        cancelLabel="아니요"
        onConfirm={() => void submit()}
        onCancel={() => setConfirmation(false)}
      />
    </AppShell>
  );
}
