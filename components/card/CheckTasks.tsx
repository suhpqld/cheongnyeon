'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CheckTask } from '@/lib/rules/checklist';
import type { PrecheckResult } from '@/lib/types';
import { btn } from './styles';

interface PendingPrecheck {
  id: string;
  checkQuestion: string;
  fixEasy: string;
  result: PrecheckResult | null;
}

interface CheckTasksProps {
  appId: string;
  tasks: CheckTask[];
  precheckPending: PendingPrecheck[];
  onSpeak?: (text: string) => void;
}

/** 탭 1 아래: 확인할 것 + 내기 전 점검 남은 것 */
export default function CheckTasks({ appId, tasks, precheckPending, onSpeak }: CheckTasksProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      {tasks.length > 0 && (
        <div className="rounded-2xl border-[3px] border-warn bg-white p-4">
          <h3 className="text-[1.1rem] font-bold text-warn">⚠ 확인할 것 {tasks.length}개</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {tasks.map((t) => (
              <li key={t.key} className="flex flex-col gap-2">
                <p className="text-[1rem] leading-relaxed">
                  <b>{t.label}</b>: {t.display}
                </p>
                <div className="flex flex-wrap gap-2">
                  {t.checkGuide && (
                    <button
                      type="button"
                      aria-expanded={open === t.key}
                      onClick={() => {
                        const next = open === t.key ? null : t.key;
                        setOpen(next);
                        if (next && t.checkGuide) onSpeak?.(t.checkGuide);
                      }}
                      className={btn.small}
                    >
                      어디서 확인해요?
                    </button>
                  )}
                  <Link href={`/a/${appId}/q?field=${encodeURIComponent(t.key)}&from=review`} className={btn.small}>
                    고치기
                  </Link>
                </div>
                {open === t.key && t.checkGuide && (
                  <p className="rounded-xl bg-primary-soft p-3 text-[0.95rem] leading-relaxed">{t.checkGuide}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {precheckPending.length > 0 && (
        <div className="rounded-2xl border-2 border-ink bg-white p-4">
          <h3 className="text-[1.1rem] font-bold">내기 전 점검 남은 것 {precheckPending.length}개</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {precheckPending.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                <p className="text-[1rem] font-bold leading-relaxed">{p.checkQuestion}</p>
                <p className="text-[0.95rem] leading-relaxed">{p.fixEasy}</p>
              </li>
            ))}
          </ul>
          <Link href={`/a/${appId}/precheck`} className={btn.secondary + ' mt-4'}>
            다시 점검하기
          </Link>
        </div>
      )}
    </>
  );
}
