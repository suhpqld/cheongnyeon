'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { apiFetch, ApiError } from '@/lib/client/api';
import { saveSession } from '@/lib/client/session';
import { PROGRAM_CODE } from '@/lib/constants';
import type { Session } from '@/lib/types';

export default function SupplementStart() {
  const router = useRouter();
  const starting = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      const session = await apiFetch<Session>('/api/apps', {
        method: 'POST', body: { programCode: PROGRAM_CODE, helperMode: 'family', startStatus: 'supplementing' },
      });
      saveSession(session);
      router.push('/a/' + encodeURIComponent(session.appId) + '/photo');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '신청을 시작하지 못했어요. 다시 시도해 주세요.');
      starting.current = false;
      setBusy(false);
    }
  }

  return <AppShell back={{ href: '/' }} todo="받은 종이를 준비해 주세요" speakText="받은 종이를 준비해 주세요.">
    <div className="grid gap-3">
      <p>(준비 중이에요)</p>
      <BigButton onClick={start} disabled={busy}>{busy ? '준비하고 있어요' : '받은 종이를 보여 줄게요'}</BigButton>
      {error && <p className="text-warn" role="alert">{error}</p>}
    </div>
  </AppShell>;
}
