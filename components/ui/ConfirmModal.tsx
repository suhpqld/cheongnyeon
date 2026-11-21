'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { BigButton } from './BigButton';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={bodyId}
    onCancel={event => { event.preventDefault(); onCancel(); }}
    className="m-auto w-[min(92vw,480px)] rounded-xl border-[3px] border-line bg-bg p-4 text-ink backdrop:bg-black/55">
    <h2 id={titleId}>{title}</h2>
    <div id={bodyId} className="my-3">{body}</div>
    <div className="grid gap-3">
      <BigButton onClick={onConfirm}>{confirmLabel}</BigButton>
      <BigButton variant="secondary" onClick={onCancel}>{cancelLabel}</BigButton>
    </div>
  </dialog>;
}

export default ConfirmModal;
