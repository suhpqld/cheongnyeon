'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useSettings } from '@/lib/client/settings';
import { speak, stopSpeaking, useAutoSpeak, useSpeaking } from '@/lib/client/tts';
import { formatCode } from '@/lib/format';
import { ConfirmModal } from './ConfirmModal';

interface AppShellProps {
  children: ReactNode;
  back?: { href: string } | { onClick: () => void } | null;
  showHome?: boolean;
  todo?: string | null;
  speakText?: string | null;
  resumeCode?: string | null;
  plain?: boolean;
}

const controlStyle = 'flex min-h-16 items-center justify-center rounded-lg px-1 text-center text-[0.9rem] font-bold';
const digits = ['공', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

export function AppShell({ children, back, showHome = true, todo, speakText = null, resumeCode, plain }: AppShellProps) {
  const router = useRouter();
  const [confirmHome, setConfirmHome] = useState(false);
  const { sound } = useSettings();
  const speaking = useSpeaking();
  useAutoSpeak(speakText);

  return <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-3">
    {!plain && <>
      <header className="grid grid-cols-3 items-center py-1">
        <div>{back && ('href' in back
          ? <Link href={back.href} className={controlStyle}>← 뒤로</Link>
          : <button type="button" className={controlStyle + ' w-full'} onClick={back.onClick}>← 뒤로</button>)}</div>
        {showHome && <button type="button" className={controlStyle + ' col-start-2'} onClick={() => setConfirmHome(true)}>처음으로</button>}
        {speakText && <button type="button" className={controlStyle + ' col-start-3'}
          disabled={sound === 'off' && !speaking}
          onClick={() => speaking ? stopSpeaking() : speak(speakText)}>
          {speaking ? '■ 그만 듣기' : '🔊 다시 듣기'}
        </button>}
      </header>
      {todo && <p className="rounded-xl bg-primary-soft p-2 font-bold">👉 지금 할 일: {todo}</p>}
      <ConfirmModal open={confirmHome} title="처음 화면으로 갈까요?" body="쓴 내용은 저장돼 있어요."
        confirmLabel="네, 갈게요" cancelLabel="아니요" onCancel={() => setConfirmHome(false)}
        onConfirm={() => { setConfirmHome(false); stopSpeaking(); router.push('/'); }} />
    </>}
    <main className="flex-1 py-3">{children}</main>
    {!plain && resumeCode && <footer className="pb-2 text-center">
      <button type="button" className={controlStyle + ' w-full'}
        onClick={() => speak([...resumeCode].map(digit => digits[Number(digit)]).join('. '))}>
        이어서 하기 번호 {formatCode(resumeCode)}
      </button>
    </footer>}
  </div>;
}

export default AppShell;
