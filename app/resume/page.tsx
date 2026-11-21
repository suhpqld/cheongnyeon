'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { getSession } from '@/lib/client/session';
import { useState } from 'react';

export default function Resume() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  function openSavedApplication() {
    const session = getSession();
    if (session) router.push('/a/' + encodeURIComponent(session.appId));
    else setMessage('이 기기에 저장된 신청이 없어요.');
  }

  return <AppShell back={{ href: '/' }} todo="저장된 신청을 열어 보세요" speakText="이어서 하기">
    <div className="grid gap-3">
      <h1>이어서 하기</h1>
      <p>(준비 중이에요)</p>
      <BigButton onClick={openSavedApplication}>하던 신청 이어서 하기</BigButton>
      {message && <p role="status">{message}</p>}
    </div>
  </AppShell>;
}
