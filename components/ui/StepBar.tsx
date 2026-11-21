// 신청 준비 5단계 표시 (채희 시안). 지금 단계는 남색, 지난 단계는 초록 ✓
const STEPS: [long: string, short: string][] = [
  ['제도 선택', '선택'],
  ['양식 확인', '양식'],
  ['정보 입력', '입력'],
  ['빠진 것 확인', '점검'],
  ['출력', '출력'],
];

export function StepBar({ current }: { current: number }) {
  return (
    <nav aria-label="신청 준비 단계" className="my-2">
      <ol className="grid grid-cols-5 gap-1">
        {STEPS.map(([long, short], i) => {
          const now = i === current;
          const done = i < current;
          return (
            <li
              key={long}
              aria-current={now ? 'step' : undefined}
              className={
                'flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-0.5 text-center text-[max(14px,0.7rem)] font-bold leading-tight ' +
                (now ? 'border-[#b5c7ff] bg-primary-soft text-primary-dark' : done ? 'border-hair bg-white text-ink' : 'border-hair bg-white text-muted')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'hidden size-5 shrink-0 place-items-center rounded-full text-[0.6rem] min-[400px]:grid ' +
                  (now ? 'bg-primary text-white' : done ? 'bg-ok-soft text-ok' : 'bg-[#edf2fa] text-muted')
                }
              >
                {done ? '✓' : i + 1}
              </span>
              <span>{short}</span>
              <span className="sr-only">{` (${long}${now ? ', 지금 단계' : done ? ', 끝남' : ''})`}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default StepBar;
