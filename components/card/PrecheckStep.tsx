'use client';

import type { ReactNode } from 'react';
import { needsFix } from '@/lib/rules/precheck';
import type { PrecheckResult, PrecheckRule } from '@/lib/types';
import { btn } from './styles';

interface PrecheckStepProps {
  rule: PrecheckRule;
  index: number; // 0부터
  total: number;
  /** 지금 화면에서 고른 결과 (no, unknown이면 고치는 방법 상자를 보여 줌) */
  result: PrecheckResult | null;
  onAnswer: (result: PrecheckResult) => void;
  onNext: () => void;
  onLater: () => void;
  onSpeak?: (text: string) => void;
  busy?: boolean;
  /** 01의 <Boknyang size="sm" /> */
  mascot?: ReactNode;
}

export default function PrecheckStep({
  rule, index, total, result, onAnswer, onNext, onLater, onSpeak, busy, mascot,
}: PrecheckStepProps) {
  const showFix = needsFix(result);
  return (
    <section className="flex flex-col gap-4">
      {index === 0 && (
        <p className="rounded-2xl bg-primary-soft p-4 text-[0.95rem] leading-relaxed">
          주민센터에서 서류를 다시 달라고 하는 경우가 많아요. 미리 확인하면 한 번에 끝낼 수 있어요.
        </p>
      )}
      <p className="text-[1rem] font-bold">
        점검 {index + 1} / {total}
      </p>
      <div className="flex items-start gap-3">
        {mascot}
        <h2 className="text-[1.4rem] font-bold leading-snug">{rule.checkQuestion}</h2>
      </div>
      <div className="rounded-2xl border-2 border-ink bg-white p-4">
        <p className="text-[0.9rem] font-bold">왜 확인하나요?</p>
        <p className="mt-1 text-[0.95rem] leading-relaxed">{rule.whyEasy}</p>
      </div>
      {rule.relatedDoc && <p className="text-[0.95rem]">관련 서류: {rule.relatedDoc}</p>}

      {!showFix ? (
        <div className="flex flex-col gap-3">
          <button type="button" disabled={busy} onClick={() => onAnswer('yes')} className={btn.primary}>
            ✅ 예, 됐어요
          </button>
          <button type="button" disabled={busy} onClick={() => onAnswer('no')} className={btn.secondary}>
            아니요
          </button>
          <button type="button" disabled={busy} onClick={() => onAnswer('unknown')} className={btn.secondary}>
            잘 모르겠어요
          </button>
          <button type="button" onClick={onLater} className={btn.link + ' self-center'}>
            나중에 할게요
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-[3px] border-primary bg-primary-soft p-5">
            <p className="text-[1rem] font-bold">이렇게 하면 돼요</p>
            <p className="mt-2 text-[1.2rem] font-bold leading-relaxed">{rule.fixEasy}</p>
          </div>
          <button type="button" onClick={onNext} className={btn.primary}>
            알겠어요, 다음
          </button>
        </div>
      )}
    </section>
  );
}
