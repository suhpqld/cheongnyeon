'use client';

export type CardTab = 'docs' | 'places' | 'script';

interface CardTabsProps {
  selected: CardTab;
  remaining: number;
  onSelect: (tab: CardTab) => void;
}

const TABS: { key: CardTab; icon: string; label: string }[] = [
  { key: 'docs', icon: '📋', label: '챙길 서류' },
  { key: 'places', icon: '📍', label: '받으러 갈 곳' },
  { key: 'script', icon: '🗣', label: '주민센터에서 할 말' },
];

/** 처음 열 때 탭: 안 챙긴 서류가 있으면 챙길 서류, 다 챙겼으면 할 말 */
export function initialTab(remaining: number): CardTab {
  return remaining > 0 ? 'docs' : 'script';
}

export default function CardTabs({ selected, remaining, onSelect }: CardTabsProps) {
  return (
    <div role="tablist" aria-label="제출 준비 카드" className="grid grid-cols-3 gap-2">
      {TABS.map((t) => {
        const on = t.key === selected;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(t.key)}
            className={
              'flex min-h-20 flex-col items-center justify-center rounded-2xl bg-white px-1 py-2 text-center text-[0.85rem] leading-tight text-ink ' +
              'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink ' +
              (on ? 'border-[4px] border-primary font-bold underline underline-offset-4' : 'border-2 border-ink')
            }
          >
            <span aria-hidden="true" className="text-[1.1rem]">{t.icon}</span>
            <span>{t.label}</span>
            {t.key === 'docs' && remaining > 0 && <span className="text-[0.75rem] font-bold">{remaining}개 남음</span>}
            {on && <span className="text-[0.7rem] font-bold">선택됨</span>}
          </button>
        );
      })}
    </div>
  );
}
