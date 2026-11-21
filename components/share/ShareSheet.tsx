'use client';

import { useEffect, useId, useRef } from 'react';
import { BigButton } from '@/components/ui/BigButton';
import { displaySeoulDate } from '@/lib/rules/progress';

export interface FamilyLink {
  shareUrl: string;
  expiresAt: string;
}

interface ShareSheetProps {
  open: boolean;
  active: boolean;
  link: FamilyLink | null;
  busy: boolean;
  error: string;
  notice: string;
  onSend: () => void;
  onCopy: () => void;
  onStop: () => void;
  onClose: () => void;
}

export function ShareSheet({ open, active, link, busy, error, notice, onSend, onCopy, onStop, onClose }: ShareSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const description = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    <dialog ref={dialog} aria-labelledby={heading} aria-describedby={description}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="mx-auto mb-0 mt-auto max-h-[90dvh] w-[min(100%,480px)] overflow-y-auto rounded-t-3xl border-[3px] border-line bg-bg p-4 text-ink backdrop:bg-black/55">
      <div className="grid gap-3">
        <h2 id={heading}>가족에게 보내기</h2>
        <p id={description}>
          가족에게는 <strong>챙길 서류와 기한</strong>을 보여 줘요.
          금액, 답, 이어서 하기 번호는 보이지 않아요. 링크는 최대 7일 동안 열리고, 언제든 멈출 수 있어요.
        </p>
        {active && <p className="rounded-xl bg-primary-soft p-2 font-bold">
          지금 가족이 볼 수 있어요{link ? ' · ' + displaySeoulDate(link.expiresAt) + '까지' : ''}
        </p>}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert" className="font-bold text-warn">{error}</p>}
        {link && active && <label className="grid gap-1">
          <span className="font-bold">가족 공유 링크</span>
          <input className="min-h-16 w-full rounded-xl border-2 border-line bg-white px-2" readOnly value={link.shareUrl}
            onFocus={event => event.currentTarget.select()} />
        </label>}
        <BigButton disabled={busy} onClick={onSend}>
          {busy ? '확인하고 있어요' : active ? '🔗 링크 다시 보내기' : '보내기'}
        </BigButton>
        {active && <>
          {link && <BigButton disabled={busy} onClick={onCopy} variant="secondary">링크 복사</BigButton>}
          <BigButton disabled={busy} onClick={onStop} variant="secondary">공유 멈추기</BigButton>
        </>}
        <BigButton disabled={busy} onClick={onClose} variant="secondary">닫기</BigButton>
      </div>
    </dialog>
  );
}
