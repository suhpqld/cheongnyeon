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
    <AppShell back={null} showHome={false} todo={TODO} speakText={WELCOME} step={0}>
      <div className="grid gap-5">
        <section
          aria-labelledby="hero-title"
          className="relative isolate min-h-[230px] overflow-hidden rounded-[20px] px-4 py-5 text-white shadow-[0_17px_36px_#1b315b2b]"
          style={{ background: 'radial-gradient(ellipse at 81% 61%, #4272be 0%, #233f82 34%, #142657 69%, #0b193c 100%)' }}
        >
          <div className="relative z-10 max-w-[62%]">
            <h1 id="hero-title" className="text-[clamp(1.35rem,6.2vw,2rem)] leading-[1.18]">주민센터,<br />한 번에 끝내요</h1>
            <p className="mt-3 text-[max(17px,0.85rem)] leading-relaxed text-[#e0ebff]">{DESCRIPTION}</p>
          </div>
          <div
            aria-hidden="true"
            className="absolute bottom-[10%] right-0 h-[24%] w-[40%] rounded-[50%] border border-point"
            style={{ transform: 'perspective(430px) rotateX(57deg)', background: 'radial-gradient(ellipse, #90c4fc99, #81a8ef50 62%, #5487cb55)' }}
          />
          <Image
            src="/boknyang/hero.png"
            alt=""
            width={180}
            height={180}
            unoptimized
            priority
            className="absolute bottom-[6%] right-[2%] h-[80%] w-[38%] object-contain drop-shadow-[0_17px_18px_rgba(6,13,37,0.35)]"
          />
        </section>

        <section className="grid gap-3" aria-labelledby="program-title">
          <h2 id="program-title">어떤 복지를 신청하시나요?</h2>
          {!programs && !loadError && <Loading text="복지 목록을 불러오고 있어요" />}
          {loadError && (
            <div className="grid gap-3">
              <p role="alert" className="notice notice-warn font-bold">복지 목록을 불러오지 못했어요.</p>
              <BigButton onClick={() => router.push('/p/' + encodeURIComponent(PROGRAM_CODE))}>
                서울형 기초보장 준비하기
              </BigButton>
            </div>
          )}
          {programs && (
            <ul className="grid gap-3">
              {programs.map((p) => {
                const open = p.status === 'available';
                return (
                  <li key={p.code}>
                    <button
                      type="button"
                      onClick={() => (open ? router.push('/p/' + encodeURIComponent(p.code)) : openSoon(p))}
                      className={
                        'flex min-h-20 w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left ' +
                        (open
                          ? 'border-primary bg-primary text-white shadow-[0_4px_0_#07132e,0_14px_30px_#24388b30]'
                          : 'border-hair bg-[#eef1f6] text-ink')
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'grid size-10 shrink-0 place-items-center rounded-[12px] text-[1.1rem] ' +
                          (open ? 'bg-white/15 text-white' : 'bg-white text-muted')
                        }
                      >
                        ▤
                      </span>
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className={'text-[1.1rem] font-bold leading-snug ' + (open ? '' : 'text-[#3d4552]')}>{p.name}</span>
                        <span className={open ? 'marker w-fit bg-white text-primary' : 'marker marker-neutral w-fit border border-[#9aa4b4]'}>
                          {open ? '✅ 신청 준비 가능' : '⏳ 준비 중'}
                        </span>
                      </span>
                      {open && <span aria-hidden="true" className="text-[1.3rem]">→</span>}
                    </button>
                  </li>
                );
              })}
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

        <div className="text-[max(18px,0.9rem)] text-muted">
          <p className="font-bold text-ink">🔒 이름과 주민등록번호는 저장하지 않아요.</p>
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
