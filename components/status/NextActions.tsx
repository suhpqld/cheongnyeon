import Link from 'next/link';
import type { NextAction } from '@/lib/rules/progress';

export function NextActions({ actions }: { actions: NextAction[] }) {
  return (
    <ul className="grid gap-3">
      {actions.map((action, index) => {
        const primary = index === 0;
        const style = action.urgent ? 'border-[3px] border-warn bg-white text-ink'
          : primary ? 'border-[3px] border-primary bg-primary text-white'
          : 'border-2 border-line bg-white text-ink';
        return (
          <li key={action.kind}>
            <Link href={action.href} className={'flex min-h-16 items-center justify-between gap-3 rounded-2xl p-3 ' + style}>
              <span className="min-w-0 break-words">
                {action.urgent && <span className="block text-[0.9rem] font-bold text-warn">⏰ 급해요</span>}
                <span className={primary ? 'block text-[max(24px,1.2rem)] font-bold leading-snug' : 'block font-bold leading-snug'}>
                  {action.title}
                </span>
                <span className="mt-1 block text-[max(18px,0.9rem)] leading-snug">{action.sub}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-2xl">→</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
