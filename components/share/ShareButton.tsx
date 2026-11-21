'use client';

import { useRef, useState } from 'react';
import { BigButton } from '@/components/ui/BigButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ShareSheet, type FamilyLink } from '@/components/share/ShareSheet';
import { ApiError, apiFetch } from '@/lib/client/api';
import type { Application } from '@/lib/types';

export function ShareButton({ appId }: { appId: string }) {
  const base = '/api/apps/' + encodeURIComponent(appId);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [active, setActive] = useState(false);
  const [link, setLink] = useState<FamilyLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '공유 상태를 확인하지 못했어요. 다시 시도해 주세요.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function openSheet() {
    setOpen(true);
    void run(async () => {
      const { app } = await apiFetch<{ app: Application }>(base);
      setActive(app.shareActive);
      if (!app.shareActive) setLink(null);
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('링크를 복사했어요. 카톡에 붙여 넣어 보내세요.');
    } catch {
      setNotice('위 링크를 선택해서 복사해 주세요.');
    }
  }

  async function send() {
    const current = await apiFetch<FamilyLink>(base + '/share', { method: 'POST' });
    setLink(current);
    setActive(true);
    if (navigator.share) {
      try {
        await navigator.share({
          title: '복냥이 복지 신청 준비',
          text: '복지 신청 준비물을 정리했어요. 같이 봐 주세요.',
          url: current.shareUrl,
        });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          setNotice('공유창을 닫았어요. 링크는 여기에서 다시 보낼 수 있어요.');
          return;
        }
      }
    }
    await copy(current.shareUrl);
  }

  async function stop() {
    setConfirmStop(false);
    await apiFetch(base + '/share', { method: 'DELETE' });
    setActive(false);
    setLink(null);
    setNotice('공유를 멈췄어요. 이전 링크로는 볼 수 없어요.');
  }

  return <>
    <BigButton variant="secondary" icon="👨‍👩‍👧" onClick={openSheet}>가족에게 보내기</BigButton>
    <ShareSheet open={open} active={active} link={link} busy={busy} error={error} notice={notice}
      onSend={() => void run(send)} onCopy={() => { if (link) void copy(link.shareUrl); }}
      onStop={() => setConfirmStop(true)} onClose={() => setOpen(false)} />
    <ConfirmModal open={confirmStop} title="이 링크를 멈출까요?"
      body="받은 사람이 더는 볼 수 없어요." confirmLabel="공유를 멈출게요" cancelLabel="아니요"
      onConfirm={() => void run(stop)} onCancel={() => setConfirmStop(false)} />
  </>;
}

export default ShareButton;
