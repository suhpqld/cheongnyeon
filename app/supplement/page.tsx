'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Loading } from '@/components/ui/Loading';
import { ApiError, apiFetch } from '@/lib/client/api';
import { clearSession, getSession, saveSession } from '@/lib/client/session';
import { speak } from '@/lib/client/tts';
import { HELPER_LABEL, PROGRAM_CODE } from '@/lib/constants';
import { formatCode } from '@/lib/format';
import type { Progress } from '@/lib/rules/progress';
import type { HelperMode, Session } from '@/lib/types';

const helpers: HelperMode[] = ['self', 'family', 'helper'];
const spokenDigits = ['공', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const photoPath = (appId: string) => '/a/' + encodeURIComponent(appId) + '/photo';

export default function SupplementStart() {
  const router = useRouter();
  const starting = useRef(false);
  const [mode, setMode] = useState<'checking' | 'choose' | 'retry'>('checking');
  const [check, setCheck] = useState(0);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function openExisting() {
      const session = getSession();
      if (!session) return 'choose';
      try {
        await apiFetch<Progress>('/api/apps/' + encodeURIComponent(session.appId) + '/progress');
        if (active) router.replace(photoPath(session.appId));
        return 'checking';
      } catch (cause) {
        if (cause instanceof ApiError && [401, 404].includes(cause.status)) {
          if (active && getSession()?.token === session.token) clearSession();
          return 'choose';
        }
        return 'retry';
      }
    }
    void openExisting().then(result => { if (active) setMode(result); });
    return () => { active = false; };
  }, [check, router]);

  async function start(helperMode: HelperMode) {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      const session = await apiFetch<Session>('/api/apps', {
        method: 'POST', body: { programCode: PROGRAM_CODE, helperMode, startStatus: 'supplementing' },
      });
      saveSession(session);
      setCreated(session);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '신청을 시작하지 못했어요. 다시 시도해 주세요.');
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }

  if (created) {
    const readCode = created.resumeCode.split('').map(number => spokenDigits[Number(number)]).join('. ');
    return (
      <AppShell back={{ href: '/' }} todo="이어서 하기 번호를 적어 두세요"
        speakText={'이어서 하기 번호예요. ' + readCode}>
        <div className="grid justify-items-center gap-4">
          <Boknyang mood="happy" />
          <h1>이어서 하기 번호</h1>
          <p className="w-full rounded-2xl bg-primary-soft py-3 text-center font-mono text-3xl font-bold tracking-wide">
            {formatCode(created.resumeCode)}
          </p>
          <p>다른 기기에서도 이 번호로 이어서 할 수 있어요.</p>
          <BigButton variant="secondary" onClick={() => speak(readCode)}>🔊 번호 다시 듣기</BigButton>
          <BigButton href={photoPath(created.appId)}>적었어요, 다음으로</BigButton>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back={{ href: '/' }} todo={mode === 'choose' ? '누가 쓰고 있는지 골라 주세요' : undefined}
      speakText={mode === 'choose' ? '누가 쓰고 있나요? 함께 쓰는 분을 골라 주세요.' : null}>
      <div className="grid gap-3">
        {mode === 'checking' && <Loading text="하던 신청을 찾아보고 있어요" />}
        {mode === 'retry' && <>
          <p role="alert">하던 신청을 확인하지 못했어요. 잠시 뒤 다시 해 주세요.</p>
          <BigButton onClick={() => { setMode('checking'); setCheck(value => value + 1); }}>다시 확인하기</BigButton>
        </>}
        {mode === 'choose' && <>
          <h1>누가 쓰고 있나요?</h1>
          <p>신청하는 분과 함께 서류를 확인해 주세요.</p>
          {helpers.map(helper => (
            <BigButton key={helper} variant={helper === 'family' ? 'primary' : 'secondary'}
              disabled={busy} onClick={() => void start(helper)}>
              {HELPER_LABEL[helper]}
            </BigButton>
          ))}
          {busy && <p role="status">신청을 시작하고 있어요</p>}
          {error && <p className="text-warn" role="alert">{error}</p>}
        </>}
      </div>
    </AppShell>
  );
}
