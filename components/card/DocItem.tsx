'use client';

import { PLACE_LABEL } from '@/lib/constants';
import { formatDateKo } from '@/lib/format';
import type { ChecklistItem } from '@/lib/types';

interface DocItemProps {
  item: ChecklistItem;
  onToggle: (item: ChecklistItem) => void;
  onSpeak?: (text: string) => void;
  busy?: boolean;
}

export default function DocItem({ item, onToggle, onSpeak, busy }: DocItemProps) {
  void onSpeak;
  return (
    <li
      className={
        'rounded-2xl bg-white p-4 ' +
        (item.isDone ? 'border-[3px] border-ok' : 'border-2 border-ink')
      }
    >
      <div className="block w-full text-left">
        <span className="block text-[1.1rem] font-bold leading-snug">{item.docName}</span>
        {item.easyExplain && <span className="mt-1 block text-[0.95rem] leading-relaxed">{item.easyExplain}</span>}
        <span className="mt-2 block text-[0.9rem] leading-relaxed">
          📍 {PLACE_LABEL[item.placeGroup].title}
          {item.issuePlace ? `: ${item.issuePlace}` : ''}
        </span>
        {item.source === 'supplement' && (
          <span className="mt-2 block text-[0.9rem] font-bold text-warn">
            📮 추가 요청{item.dueDate ? `, ${formatDateKo(item.dueDate)}까지` : ''}
          </span>
        )}
        {item.source === 'base' && item.alsoRequested && (
          <span className="mt-2 block text-[0.9rem] font-bold text-warn">📮 추가 요청에도 있어요</span>
        )}
      </div>
      <button
        type="button"
        aria-pressed={item.isDone}
        disabled={busy}
        onClick={() => onToggle(item)}
        className={
          'mt-3 inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-[1rem] font-bold ' +
          'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ' +
          (item.isDone ? 'border-[3px] border-ok text-ok' : 'border-[3px] border-ink text-ink')
        }
      >
        <span aria-hidden="true">{item.isDone ? '☑' : '☐'}</span> 챙겼어요
      </button>
    </li>
  );
}
