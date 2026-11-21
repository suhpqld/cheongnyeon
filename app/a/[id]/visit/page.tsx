'use client';

import { Suspense, use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Loading } from '@/components/ui/Loading';
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
  return <Visit key={id} id={id} />;
}

function Visit({ id }: { id: string }) {
  const base = '/a/' + encodeURIComponent(id);
  const router = useRouter();
  const saving = useRef(false);
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; href?: string; label?: string } | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Progress>('/api/apps/' + encodeURIComponent(id) + '/progress')
      .then(data => { if (active) setProgress(data); })
      .catch(cause => {
        if (!active) return;
        const resume = cause instanceof ApiError && [401, 404].includes(cause.status);
        setError(resume ? { message: '이어서 하기 번호를 넣어 주세요.', href: '/resume', label: '번호로 이어서 하기' }
          : { message: '신청 현황을 확인하지 못했어요.', href: base, label: '내 신청 현황' });
      });
    return () => { active = false; };
  }, [id, base]);

  async function submit() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setConfirmation(false);
    setError(null);
    try {
      await apiFetch('/api/apps/' + encodeURIComponent(id) + '/status', {
        method: 'PATCH', body: { status: 'submitted' },
      });
      router.replace(base + '/done');
    } catch (cause) {
      const status = cause instanceof ApiError ? cause.status : 0;
      if (status === 409) setError({ message: '신청서를 먼저 끝내 주세요.', href: base, label: '내 신청 현황' });
      else if (status === 401 || status === 404) {
        setError({ message: '이어서 하기 번호를 넣어 주세요.', href: '/resume', label: '번호로 이어서 하기' });
      } else setError({ message: cause instanceof ApiError ? cause.message : '제출 상태를 저장하지 못했어요.' });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const remaining = (progress?.checklistTotal ?? 0) - (progress?.checklistDone ?? 0);
  return (
    <AppShell back={{ href: base + '/card' }} todo="주민센터에서 어떻게 됐는지 골라 주세요"
      resumeCode={progress?.app.resumeCode}
      speakText="주민센터에 다녀오셨어요? 어떻게 됐는지 골라 주세요.">
      <div className="grid gap-3">
        <h1>주민센터에 다녀오셨어요?</h1>
        {remaining > 0 && <p className="rounded-xl bg-primary-soft p-3">
          아직 안 챙긴 서류가 {remaining}개 있어요. 그래도 냈다면 아래에서 골라 주세요.
        </p>}
        {error && <div className="grid gap-2">
          <p role="alert" className="font-bold text-warn">{error.message}</p>
          {error.href && <BigButton href={error.href} variant="secondary">{error.label}</BigButton>}
        </div>}
        {progress && <>
          <BigButton onClick={() => setConfirmation(true)} disabled={busy} icon="✅" sub="주민센터에서 접수했어요">
            {busy ? '남겨 두고 있어요' : '서류를 다 냈어요'}
          </BigButton>
          <BigButton href={base + '/photo'} variant="secondary" icon="📮" sub="추가 서류 요청 종이를 받았어요">
            서류를 더 내래요
          </BigButton>
          <BigButton href={base + '/card'} variant="secondary">아직 안 갔어요</BigButton>
        </>}
        {!progress && !error && <Loading text="준비한 서류를 확인하고 있어요" />}
      </div>
      <ConfirmModal open={confirmation} title="주민센터에 신청서와 서류를 내셨어요?"
        body="오늘 낸 걸로 적을게요." confirmLabel="네, 냈어요" cancelLabel="아니요"
        onConfirm={() => void submit()} onCancel={() => setConfirmation(false)} />
    </AppShell>
  );
}
