'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { apiFetch, ApiError } from '@/lib/client/api';
import { saveSession } from '@/lib/client/session';
import { PROGRAM_CODE } from '@/lib/constants';
import { formatCode } from '@/lib/format';
import type { HelperMode, Session } from '@/lib/types';

export default function Intro() {
  const router = useRouter();
  const starting = useRef(false);
  const [helperMode, setHelperMode] = useState<HelperMode | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      const created = await apiFetch<Session>('/api/apps', {
        method: 'POST', body: { programCode: PROGRAM_CODE, helperMode },
      });
      saveSession(created);
      setSession(created);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '신청을 시작하지 못했어요. 다시 시도해 주세요.');
      starting.current = false;
      setBusy(false);
    }
  }

  if (!helperMode) return <AppShell back={{ href: '/' }} todo="누가 쓰고 있는지 골라 주세요" speakText="지금 누가 화면을 보고 있나요? 골라 주세요.">
    <div className="grid gap-3">
      <Boknyang mood="idle" />
      <SpeechBubble>안녕하세요! 지금 누가 화면을 보고 있나요?</SpeechBubble>
      <h1>누가 쓰고 있나요?</h1>
      <BigButton icon="🙋" onClick={() => setHelperMode('self')}>신청하는 본인이에요</BigButton>
      <BigButton icon="👨‍👩‍👧" variant="secondary" sub="부모님 옆에서 같이 해요" onClick={() => setHelperMode('family')}>가족을 도와주고 있어요</BigButton>
      <BigButton icon="🤝" variant="secondary" sub="도우미, 강사, 공무원" onClick={() => setHelperMode('helper')}>주민센터나 배움터에서 도와드려요</BigButton>
    </div>
  </AppShell>;

  if (session) return <AppShell back={{ onClick: () => setSession(null) }} todo="이어서 하기 번호를 적고 시작해 주세요" speakText="이어서 하기 번호예요. 종이에 적어 두세요.">
    <div className="grid gap-4 text-center">
      <h1>이어서 하기 번호예요</h1>
      <p className="text-5xl font-black tracking-widest">{formatCode(session.resumeCode)}</p>
      <p>언제 그만둬도 이 번호로 이어서 할 수 있어요. 종이에 적어 두세요.</p>
      <BigButton variant="secondary" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance([...session.resumeCode].join(', ')))}>🔊 번호 다시 듣기</BigButton>
      <BigButton onClick={() => router.push('/a/' + encodeURIComponent(session.appId) + '/q' + (new URLSearchParams(window.location.search).has('demo') ? '?demo=1' : ''))}>적었어요, 시작할게요</BigButton>
    </div>
  </AppShell>;

  return <AppShell back={{ onClick: () => setHelperMode(null) }} todo="무엇을 신청하는지 확인하고 시작해 주세요" speakText="서울형 기초보장제도 신청서를 같이 써요. 질문은 15개쯤이고, 10분 정도 걸려요.">
    <div className="grid gap-3">
      <h1>서울형 기초보장제도</h1>
      <p className="rounded-xl bg-primary-soft p-4">질문은 15개쯤, 10분 정도 걸려요.</p>
      <p>❓ 모르는 건 잘 모르겠어요를 누르면 확인하는 방법을 알려 드려요.</p>
      <p>🔒 이름과 주민등록번호는 묻지 않아요.</p>
      {helperMode !== 'self' && <p>🗣 질문을 신청하시는 분께 읽어 드리고 같이 대답해 주세요. 신청하시는 분이 직접 말해도 돼요.</p>}
      <BigButton onClick={start} disabled={busy}>{busy ? '신청을 시작하고 있어요' : '시작할게요'}</BigButton>
      {error && <p className="text-warn" role="alert">{error}</p>}
      <Disclaimer />
    </div>
  </AppShell>;
}
