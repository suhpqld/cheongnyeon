'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useSettings } from '@/lib/client/settings';
import { speak, stopSpeaking, useAutoSpeak, useSpeaking } from '@/lib/client/tts';
import { formatCode } from '@/lib/format';
import { ConfirmModal } from './ConfirmModal';
import { StepBar } from './StepBar';

interface AppShellProps {
  children: ReactNode;
  back?: { href: string } | { onClick: () => void } | null;
  showHome?: boolean;
  todo?: string | null;
  speakText?: string | null;
  resumeCode?: string | null;
  plain?: boolean;
  /** 신청 준비 5단계 중 지금 단계 (0부터). 없으면 단계 표시 안 함 */
  step?: number;
}

const controlStyle = 'flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-[max(16px,0.8rem)] font-bold text-ink';
const toolStyle = controlStyle + ' border border-hair bg-white';
const digits = ['공', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

export function AppShell({ children, back, showHome = true, todo, speakText = null, resumeCode, plain, step }: AppShellProps) {
  const router = useRouter();
  const [confirmHome, setConfirmHome] = useState(false);
  const { sound } = useSettings();
  const speaking = useSpeaking();
  useAutoSpeak(speakText);

  return <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-3">
    {!plain && <>
      <header className="-mx-3 flex min-h-14 items-center justify-between gap-2 border-b border-[#e4eaf5] bg-white/90 px-3">
        {showHome
          ? <button type="button" className="flex min-h-12 items-center gap-2 text-left" aria-label="복냥이 처음 화면" onClick={() => setConfirmHome(true)}>
              <Brand />
            </button>
          : <div className="flex min-h-12 items-center gap-2"><Brand /></div>}
        {speakText && <button type="button" className={toolStyle}
          disabled={sound === 'off' && !speaking}
          onClick={() => speaking ? stopSpeaking() : speak(speakText)}>
          {speaking ? '■ 그만 듣기' : '🔊 다시 듣기'}
        </button>}
      </header>
      {back && <div className="pt-1">{'href' in back
        ? <Link href={back.href} className={controlStyle + ' inline-flex text-primary-dark underline underline-offset-4'}>← 뒤로</Link>
        : <button type="button" className={controlStyle + ' text-primary-dark underline underline-offset-4'} onClick={back.onClick}>← 뒤로</button>}</div>}
      {step !== undefined && <StepBar current={step} />}
      {todo && <p className="notice mt-1 font-bold"><span className="text-primary-dark">지금 할 일</span> · {todo}</p>}
      <ConfirmModal open={confirmHome} title="처음 화면으로 갈까요?" body="쓴 내용은 저장돼 있어요."
        confirmLabel="네, 갈게요" cancelLabel="아니요" onCancel={() => setConfirmHome(false)}
        onConfirm={() => { setConfirmHome(false); stopSpeaking(); router.push('/'); }} />
    </>}
    <main className="flex-1 py-3">{children}</main>
    {!plain && resumeCode && <footer className="pb-2 text-center">
      <button type="button" className={toolStyle + ' w-full'}
        onClick={() => speak([...resumeCode].map(digit => digits[Number(digit)]).join('. '))}>
        이어서 하기 번호 {formatCode(resumeCode)}
      </button>
    </footer>}
  </div>;
}

function Brand() {
  return <>
    <span aria-hidden="true" className="grid size-8 place-items-center rounded-[10px] bg-primary text-white">✦</span>
    <strong className="text-[1.2rem] tracking-tight">복냥이</strong>
    <span className="hidden border-l border-hair pl-2 text-[max(15px,0.75rem)] text-muted min-[400px]:inline">복지 신청 준비</span>
  </>;
}

export default AppShell;
