'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { apiFetch, ApiError } from '@/lib/client/api';
import { saveSession } from '@/lib/client/session';
import { PROGRAM_CODE } from '@/lib/constants';
import type { Session } from '@/lib/types';

export default function Intro() {
  const router = useRouter();
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      const session = await apiFetch<Session>('/api/apps', {
        method: 'POST', body: { programCode: PROGRAM_CODE, helperMode: 'family' },
      });
      saveSession(session);
      router.push('/a/' + encodeURIComponent(session.appId) + '/q');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '신청을 시작하지 못했어요. 다시 시도해 주세요.');
      starting.current = false;
      setBusy(false);
    }
  }

  return <AppShell back={{ href: '/' }} todo="시작할게요를 눌러 주세요" speakText="서울형 기초보장제도. 준비되면 시작할게요를 눌러 주세요.">
    <div className="grid gap-3">
      <h1>누가 쓰고 있나요?</h1>
      <h2>서울형 기초보장제도</h2>
      <p>(준비 중이에요)</p>
      <BigButton onClick={start} disabled={busy}>{busy ? '신청을 시작하고 있어요' : '시작할게요'}</BigButton>
      {error && <p className="text-warn" role="alert">{error}</p>}
    </div>
  </AppShell>;
}
