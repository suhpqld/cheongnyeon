'use client';

import Link from 'next/link';
import { useState } from 'react';
import { btn } from '@/components/card/styles';
import type { PrecheckResult } from '@/lib/types';
import type { CheckItem, PrecheckItem } from '@/app/api/apps/[id]/ready/remaining';

/** S3로 가는 주소. 값을 넣을 칸을 field로 넘긴다 */
export function fillHref(appId: string, fieldKey: string): string {
  return `/a/${encodeURIComponent(appId)}/fill?field=${encodeURIComponent(fieldKey)}&from=ready`;
}

interface Props {
  appId: string;
  checks: CheckItem[];
  prechecks: PrecheckItem[];
  busyId: string | null;
  onPrecheck: (id: string, result: PrecheckResult) => void;
  onSpeak?: (text: string) => void;
}

/** 챙길 서류 탭 아래: 확인할 것 + 자주 빠지는 것 */
export default function RemainingChecks({ appId, checks, prechecks, busyId, onPrecheck, onSpeak }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      {checks.length > 0 && (
        <div className="rounded-2xl border-[3px] border-warn bg-white p-4">
          <h3 className="text-[1.1rem] font-bold text-warn">⚠ 확인할 것 {checks.length}개</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {checks.map((t) => (
              <li key={t.id} className="flex flex-col gap-2">
                <p className="text-[1rem] leading-relaxed">
                  <b>{t.label}</b>: {t.display}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-expanded={open === t.id}
                    onClick={() => {
                      const next = open === t.id ? null : t.id;
                      setOpen(next);
                      if (next) onSpeak?.(t.checkGuide ?? '주민센터에서 같이 확인해요.');
                    }}
                    className={btn.small}
                  >
                    어디서 확인해요?
                  </button>
                  <Link href={fillHref(appId, t.id)} className={btn.small}>
                    값 넣기
                  </Link>
                </div>
                {open === t.id && (
                  <p className="rounded-xl bg-primary-soft p-3 text-[0.95rem] leading-relaxed">
                    {t.checkGuide ?? '주민센터에서 같이 확인해요.'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {prechecks.length > 0 && (
        <div className="rounded-2xl border-2 border-ink bg-white p-4">
          <h3 className="text-[1.1rem] font-bold">💡 주민센터에서 자주 다시 달라는 것 {prechecks.length}개</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {prechecks.map((p) => (
              <li key={p.id} className="flex flex-col gap-2">
                <p className="text-[1rem] font-bold leading-relaxed">{p.label}</p>
                {(p.result === 'no' || p.result === 'unknown') && (
                  <p className="rounded-xl bg-primary-soft p-3 text-[0.95rem] leading-relaxed">{p.fixEasy}</p>
                )}
                <div className="grid grid-cols-2 gap-2" role="group" aria-label={p.label}>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => onPrecheck(p.id, 'yes')}
                    className={btn.small}
                  >
                    예
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    aria-pressed={p.result === 'no'}
                    onClick={() => onPrecheck(p.id, 'no')}
                    className={btn.small + (p.result === 'no' ? ' border-[3px] border-primary' : '')}
                  >
                    아니요
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
