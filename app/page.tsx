'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ProgramListItem } from '@/app/api/programs/route';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { apiFetch } from '@/lib/client/api';
import { PROGRAM_CODE } from '@/lib/constants';
import { useSettings } from '@/lib/client/settings';
import { speak, stopSpeaking, useSpeaking } from '@/lib/client/tts';

const TODO = '신청하고 싶은 복지를 골라 주세요';
const DESCRIPTION =
  '신청서를 미리 채우고 필요한 서류를 빠짐없이 챙겨 드려요. 준비가 끝나면 출력해서 주민센터에 한 번만 가면 돼요.';
const WELCOME = `안녕하세요, 복냥이예요. 주민센터, 한 번에 끝내요. ${DESCRIPTION} ${TODO}.`;

/** 마지막 한글 글자에 받침이 있으면 "은", 없으면 "는" */
function topic(name: string): string {
  const last = [...name].reverse().find((c) => c >= '가' && c <= '힣');
  if (!last) return name + '은';
  return name + ((last.charCodeAt(0) - 0xac00) % 28 ? '은' : '는');
}

export default function Home() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [soon, setSoon] = useState<ProgramListItem | null>(null);
  const { sound, fontSize, setSound, setFontSize } = useSettings();
  const reading = useSpeaking();

  useEffect(() => {
    let alive = true;
    apiFetch<{ programs: ProgramListItem[] }>('/api/programs')
      .then((r) => alive && setPrograms(r.programs))
      .catch(() => alive && setLoadError(true));
    return () => { alive = false; };
  }, []);

  const available = programs?.find((p) => p.status === 'available') ?? null;
  const availableCode = available?.code ?? PROGRAM_CODE;

  function toggleSound() {
    if (sound === 'on') stopSpeaking();
    setSound(sound === 'on' ? 'off' : 'on');
  }

  function openSoon(p: ProgramListItem) {
    setSoon(p);
    speak(soonText(p));
  }

  return (
    <AppShell back={null} showHome={false} todo={TODO} speakText={WELCOME}>
      <div className="grid gap-5">
        <div className="grid justify-items-center gap-3 rounded-3xl border border-primary/15 bg-white px-4 py-4 text-center shadow-sm">
          <div className="w-full max-w-[140px] min-[430px]:max-w-[180px] [&_img]:h-auto [&_img]:w-full">
            <Image src="/boknyang/hero.png" alt="" width={180} height={180} unoptimized priority className="object-contain" />
          </div>
          <h1>주민센터, 한 번에 끝내요</h1>
          <p className="leading-relaxed">{DESCRIPTION}</p>
        </div>

        <section className="grid gap-3" aria-labelledby="program-title">
          <h2 id="program-title">신청하고 싶은 복지를 골라 주세요</h2>
          {!programs && !loadError && <Loading text="복지 목록을 불러오고 있어요" />}
          {loadError && (
            <div className="grid gap-3">
              <p role="alert" className="font-bold text-warn">복지 목록을 불러오지 못했어요.</p>
              <BigButton onClick={() => router.push('/p/' + encodeURIComponent(PROGRAM_CODE))}>
                서울형 기초보장 준비하기
              </BigButton>
            </div>
          )}
          {programs && (
            <ul className="grid gap-3">
              {programs.map((p) => (
                <li key={p.code}>
                  {p.status === 'available' ? (
                    <button
                      type="button"
                      onClick={() => router.push('/p/' + encodeURIComponent(p.code))}
                      className="flex min-h-20 w-full flex-col items-start gap-1 rounded-2xl border-[3px] border-primary bg-primary px-4 py-3 text-left text-white"
                    >
                      <span className="rounded-full bg-white px-3 py-0.5 text-[max(18px,0.85rem)] font-bold text-primary">
                        ✅ 신청 준비 가능
                      </span>
                      <span className="text-[1.15rem] font-bold leading-snug">{p.name}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSoon(p)}
                      className="flex min-h-20 w-full flex-col items-start gap-1 rounded-2xl border-2 border-[#8a93a3] bg-[#e6e8ec] px-4 py-3 text-left text-ink"
                    >
                      <span className="rounded-full border-2 border-[#5b6472] bg-white px-3 py-0.5 text-[max(18px,0.85rem)] font-bold text-[#3d4552]">
                        ⏳ 준비 중
                      </span>
                      <span className="text-[1.05rem] font-bold leading-snug">{p.name}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-3 min-[360px]:grid-cols-2" aria-label="이어서 하기와 추가 서류">
          <BigButton href="/resume" icon="🔢" variant="secondary" sub="8자리 번호">
            준비하던 것 이어서 하기
          </BigButton>
          <BigButton href="/supplement" icon="📮" variant="secondary">
            주민센터에서 서류를 더 내래요
          </BigButton>
        </div>

        <div className="grid gap-3" aria-label="읽어 주기와 글씨 설정">
          <div className="grid gap-3 min-[360px]:grid-cols-2">
            <BigButton variant="secondary" onClick={toggleSound}>
              소리 {sound === 'on' ? '켜짐' : '꺼짐'}
            </BigButton>
            <BigButton variant="secondary" onClick={() => setFontSize(fontSize === 'large' ? 'normal' : 'large')}>
              글씨 {fontSize === 'large' ? '크게' : '보통'}
            </BigButton>
          </div>
          <BigButton variant="secondary" onClick={() => (reading ? stopSpeaking() : speak(WELCOME))}>
            {reading ? '■ 그만 듣기' : '🔊 다시 듣기'}
          </BigButton>
        </div>

        <div className="text-[max(18px,0.9rem)]">
          <p className="font-bold">🔒 이름과 주민등록번호는 저장하지 않아요.</p>
          <Disclaimer />
        </div>
      </div>

      <ConfirmModal
        open={soon !== null}
        title="아직 준비 중이에요"
        body={<p className="leading-relaxed">{soon ? soonText(soon) : ''}</p>}
        confirmLabel="서울형 기초보장 준비하기"
        cancelLabel="닫기"
        onConfirm={() => {
          setSoon(null);
          router.push('/p/' + encodeURIComponent(availableCode));
        }}
        onCancel={() => setSoon(null)}
      />
    </AppShell>
  );
}

function soonText(p: ProgramListItem): string {
  return `${topic(p.name)} 아직 준비 중이에요. 지금은 서울형 기초보장제도만 준비해 드릴 수 있어요. 같은 신청서를 쓰는 제도부터 차례로 추가할 예정이에요.`;
}
