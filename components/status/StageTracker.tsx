import { ddayLabel } from '@/lib/format';
import { displaySeoulDate } from '@/lib/rules/progress';
import type { AppStatus } from '@/lib/types';

export interface StageTrackerProps {
  status: AppStatus;
  docsReady: boolean;
  submittedAt: string | null;
  supplementDday: number | null;
  compact?: boolean;
}

export function StageTracker({ status, docsReady, submittedAt, supplementDday, compact }: StageTrackerProps) {
  const current = status === 'drafting' ? 0
    : status === 'submitted' ? 3
    : status === 'supplementing' || docsReady ? 2
    : 1;
  const steps = [
    { label: '신청서 쓰기', completion: status !== 'drafting' ? '신청서 다 썼어요' : null },
    { label: '서류 챙기기', completion: docsReady ? '서류 준비 완료' : null },
    { label: '주민센터에 내기', completion: submittedAt ? '제출 완료 (' + displaySeoulDate(submittedAt) + ')' : null },
    { label: '결과 기다리기', completion: null },
  ];
  const supplementLabel = status === 'supplementing'
    ? '추가 서류' + (supplementDday === null ? '' : ' ' + ddayLabel(supplementDday).big)
    : null;

  return (
    <ol aria-label="복지 신청 단계" className={compact ? 'grid grid-cols-4 gap-1 text-center' : 'grid gap-2 min-[540px]:grid-cols-4'}>
      {steps.map((step, index) => {
        const active = index === current;
        const detail = index === 2 ? supplementLabel : index === 3 && active ? '결과 기다리는 중' : null;
        const border = active ? 'border-[3px] border-line bg-primary-soft'
          : step.completion ? 'border-[3px] border-ok bg-white'
          : 'border border-line/45 bg-white';
        return (
          <li key={step.label} aria-current={active ? 'step' : undefined}
            className={'min-w-0 rounded-xl ' + border + (compact ? ' p-1.5' : ' p-2.5')}>
            <div className={compact ? 'grid justify-items-center gap-1' : 'flex items-center gap-2 min-[540px]:grid'}>
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[0.85rem] font-bold text-white">
                {index + 1}
              </span>
              <span className={compact ? 'sr-only' : 'font-bold leading-snug'}>{step.label}</span>
              {active && <span className="text-[0.9rem] font-bold">지금</span>}
              {compact && !active && step.completion && <span aria-hidden="true" className="font-bold text-ok">✓</span>}
            </div>
            {step.completion && (
              <p className={compact ? 'sr-only' : 'mt-1 text-[0.9rem] font-bold leading-snug text-ok'}>
                <span aria-hidden="true">✓ </span>{step.completion}
              </p>
            )}
            {detail && <p className={compact ? 'sr-only' : 'mt-1 text-[0.9rem] font-bold leading-snug ' + (index === 2 ? 'text-warn' : '')}>{detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export default StageTracker;
