'use client';

import { useState, type ReactNode } from 'react';
import DocItem from './DocItem';
import type { ChecklistItem } from '@/lib/types';

interface DocListProps {
  /** sortChecklist로 정렬된 목록 */
  items: ChecklistItem[];
  onToggle: (item: ChecklistItem) => void;
  onSpeak?: (text: string) => void;
  busyId?: string | null;
  /** 다 챙겼을 때 보이는 복냥이 (01의 <Boknyang mood="happy" />). 없으면 그림 없이 */
  happyMascot?: ReactNode;
  /** 맨 아래 (확인할 것, 남은 점검) */
  children?: ReactNode;
}

/** 탭 1에서 읽어 줄 말 */
export function docsSpeakText(items: ChecklistItem[]): string {
  const pending = items.filter((i) => !i.isDone);
  if (pending.length === 0) return '서류 준비 완료! 이제 주민센터에 내러 가요.';
  return `챙길 서류가 ${pending.length}개 남았어요. ${pending.map((i) => i.docName).join(', ')}`;
}

export default function DocList({ items, onToggle, onSpeak, busyId, happyMascot, children }: DocListProps) {
  const [showDone, setShowDone] = useState(false);
  const pending = items.filter((i) => !i.isDone);
  const done = items.filter((i) => i.isDone);
  const total = items.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[1rem] font-bold">
          {total}개 중 {done.length}개 챙겼어요
        </p>
        <div
          className="mt-2 h-4 w-full overflow-hidden rounded-full border-2 border-ink bg-white"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done.length}
          aria-label="챙긴 서류"
        >
          <div className="h-full bg-ok" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {total > 0 && pending.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-[3px] border-ok bg-[#E8F5EC] p-5 text-center text-ok">
          {happyMascot}
          <p className="text-[1.2rem] font-bold">✅ 서류 준비 완료!</p>
          <p className="text-[1rem] text-ink">이제 주민센터에 내러 가요.</p>
        </div>
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((i) => (
            <DocItem key={i.id} item={i} onToggle={onToggle} onSpeak={onSpeak} busy={busyId === i.id} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
            className="inline-flex min-h-16 w-full items-center justify-between rounded-2xl border-2 border-ink bg-white px-4 text-[1rem] font-bold focus-visible:outline focus-visible:outline-4 focus-visible:outline-ink"
          >
            <span>✅ 챙긴 서류 {done.length}개</span>
            <span>{showDone ? '(접기)' : '(펼치기)'}</span>
          </button>
          {showDone && (
            <ul className="mt-3 flex flex-col gap-3">
              {done.map((i) => (
                <DocItem key={i.id} item={i} onToggle={onToggle} onSpeak={onSpeak} busy={busyId === i.id} />
              ))}
            </ul>
          )}
        </div>
      )}

      {children}
    </section>
  );
}
