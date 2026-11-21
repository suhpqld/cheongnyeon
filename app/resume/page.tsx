'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { saveSession } from '@/lib/client/session';
import { RESUME_CODE_LENGTH, RESUME_LOCK_MINUTES } from '@/lib/constants';
import { formatCode } from '@/lib/format';
import type { Session } from '@/lib/types';

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0'];

export default function Resume() {
  const router = useRouter();
  const submitting = useRef(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setTimeout(() => {
      setLockedUntil(null);
      setMessage('다시 번호를 눌러 볼 수 있어요.');
    }, Math.max(0, lockedUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  function change(value: string) {
    setCode(value.normalize('NFKC').replace(/\D/g, '').slice(0, RESUME_CODE_LENGTH));
    if (message && !lockedUntil) setMessage('');
  }

  async function submit() {
    if (submitting.current || lockedUntil || code.length !== RESUME_CODE_LENGTH) return;
    submitting.current = true;
    setBusy(true);
    setMessage('');
    let opening = false;
    try {
      const response = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (response.ok) {
        const session: Session = data;
        saveSession(session);
        router.replace('/a/' + encodeURIComponent(session.appId));
        opening = true;
        return;
      }

      if (response.status === 429 || (response.status === 404 && data.remaining === 0)) {
        const seconds = Number(data.retryAfterSeconds) || RESUME_LOCK_MINUTES * 60;
        setLockedUntil(Date.now() + seconds * 1000);
        setMessage('번호를 여러 번 틀렸어요. ' + Math.max(1, Math.ceil(seconds / 60)) + '분 뒤에 다시 해 주세요.');
      } else {
        setMessage(typeof data.remaining === 'number'
          ? data.message + ' 남은 시도 ' + data.remaining + '번.'
          : data.message ?? '잠시 뒤 다시 시도해 주세요.');
      }
    } catch {
      setMessage('신청을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      if (!opening) {
        submitting.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <AppShell back={{ href: '/' }} todo="이어서 하기 번호 8자리를 눌러 주세요"
      speakText="이어서 하기 번호 여덟 자리를 눌러 주세요.">
      <form className="grid gap-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <h1>이어서 하기</h1>
        <fieldset className="grid gap-3 disabled:opacity-70" disabled={busy || lockedUntil !== null}>
          <label htmlFor="resume-number" className="font-bold">이어서 하기 번호</label>
          <input id="resume-number" value={formatCode(code)} onChange={event => change(event.target.value)}
            inputMode="none" placeholder="□□□□ □□□□" autoComplete="off"
            className="min-h-16 w-full rounded-xl border-[3px] border-line bg-white px-2 text-center font-mono text-2xl font-bold tracking-widest placeholder:text-ink/60" />
          <div className="grid grid-cols-3 gap-3">
            {keys.map(key => (
              <BigButton key={key} variant="secondary" onClick={() => change(key === '지우기' ? code.slice(0, -1) : code + key)}>
                {key}
              </BigButton>
            ))}
            <button type="submit" disabled={code.length !== RESUME_CODE_LENGTH}
              className="min-h-16 rounded-xl bg-primary px-1 py-2 font-bold text-white disabled:opacity-65">
              이어서 하기
            </button>
          </div>
        </fieldset>
        {busy && <p role="status">신청을 열고 있어요</p>}
        {message && <p role="alert" className="rounded-xl border-2 border-warn bg-white p-3 font-bold text-warn">{message}</p>}
      </form>
    </AppShell>
  );
}
