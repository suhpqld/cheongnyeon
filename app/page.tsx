'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { ApiError, apiFetch } from '@/lib/client/api';
import { clearSession, getSession } from '@/lib/client/session';
import { useSettings } from '@/lib/client/settings';
import { speak, stopSpeaking, useSpeaking } from '@/lib/client/tts';
import type { Progress } from '@/lib/rules/progress';

const welcome = '안녕하세요, 복냥이예요. 복지 신청서를 쓰려면 신청서 쓰기를, 주민센터에서 서류를 더 내라는 종이를 받으셨으면 서류를 더 내래요를 눌러 주세요.';
const instructions = '복냥이는 복지 신청서를 같이 쓰는 도우미예요. 가족이나 배움터 선생님이 옆에서 같이 해도 돼요. 신청서를 쓰려면 신청서 쓰기를 누르세요. 질문이 하나씩 나오면 말로 대답하거나 버튼을 누르면 돼요. 주민센터에서 서류를 더 내라는 종이를 받았다면 서류를 더 내래요를 누르고 그 종이를 사진으로 찍어 주세요. 언제 그만둬도 여덟 자리 번호로 이어서 할 수 있어요.';

export default function Home() {
  const [application, setApplication] = useState<Progress | null>(null);
  const { sound, fontSize, setSound, setFontSize } = useSettings();
  const reading = useSpeaking();

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    let active = true;
    apiFetch<Progress>('/api/apps/' + encodeURIComponent(session.appId) + '/progress')
      .then(progress => {
        if (active && getSession()?.token === session.token) setApplication(progress);
      })
      .catch(error => {
        if (active && error instanceof ApiError && [401, 404].includes(error.status) &&
          getSession()?.token === session.token) clearSession();
      });
    return () => { active = false; };
  }, []);

  function toggleSound() {
    if (sound === 'on') stopSpeaking();
    setSound(sound === 'on' ? 'off' : 'on');
  }

  function readInstructions() {
    if (reading) stopSpeaking();
    else {
      if (sound === 'off') setSound('on');
      speak(instructions);
    }
  }

  return (
    <AppShell back={null} showHome={false} todo="무엇을 하러 오셨는지 골라 주세요" speakText={welcome}>
      <div className="grid gap-5">
        <div className="grid justify-items-center gap-3 rounded-3xl border border-primary/15 bg-white px-4 py-3 text-center shadow-sm">
          <div className="w-full max-w-[120px] min-[430px]:max-w-[180px] [&_img]:h-auto [&_img]:w-full">
            <Image src="/boknyang/hero.png" alt="" width={180} height={180} unoptimized className="object-contain" />
          </div>
          <h1>복냥이</h1>
          <p className="font-bold">어려운 복지 서류, 이제 나한테 말하면 된다냥</p>
          <SpeechBubble>안녕하세요, 복냥이예요! 복지 서류, 저한테 말하면 같이 채워 드릴게요.</SpeechBubble>
        </div>
        <div className="grid gap-3" aria-label="신청 시작과 이어서 하기">
          {application && (
            <BigButton href={'/a/' + encodeURIComponent(application.app.id)} icon="▶"
              sub={application.nextActions[0]?.title}>
              하던 신청 이어서 하기
            </BigButton>
          )}
          <BigButton href="/intro" icon="📝">신청서 쓰기</BigButton>
          <BigButton href="/supplement" icon="📮" variant="secondary" sub="주민센터에서 추가 서류 요청을 받았어요">
            서류를 더 내래요
          </BigButton>
          <BigButton href="/resume" icon="🔢" variant="secondary">번호로 이어서 하기</BigButton>
        </div>
        <div className="grid gap-3" aria-label="읽어 주기와 글씨 설정">
          <BigButton variant="secondary" onClick={readInstructions}>
            {reading ? '■ 그만 듣기' : '🔊 사용법 듣기 (30초)'}
          </BigButton>
          <div className="grid gap-3 min-[360px]:grid-cols-2">
            <BigButton variant="secondary" onClick={toggleSound}>
              소리 {sound === 'on' ? '켜짐' : '꺼짐'}
            </BigButton>
            <BigButton variant="secondary" onClick={() => setFontSize(fontSize === 'large' ? 'normal' : 'large')}>
              글씨 {fontSize === 'large' ? '크게' : '보통'}
            </BigButton>
          </div>
        </div>
        <div className="text-[max(18px,0.9rem)]">
          <p>이름과 주민등록번호는 저장하지 않아요.</p>
          <Disclaimer />
        </div>
      </div>
    </AppShell>
  );
}
