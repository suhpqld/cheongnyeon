'use client';

import { groupByPlace, naverMapUrl, officeName } from '@/lib/rules/checklist';
import { PLACE_LABEL } from '@/lib/constants';
import type { ChecklistItem } from '@/lib/types';
import { btn } from './styles';

type Place = { district: string | null; dong: string | null };

/** 주민센터 이름 + 지도 + 120 (탭 2, 탭 3에서 같이 씀) */
export function OfficeLinks({ place }: { place: Place }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-[1rem] font-bold">📍 {officeName(place)}</p>
      <div className="grid grid-cols-2 gap-3">
        <a href={naverMapUrl(place)} target="_blank" rel="noopener noreferrer" className={btn.secondary}>
          🗺 지도에서 찾기
        </a>
        <a href="tel:120" className={btn.secondary}>
          📞 120에 물어보기
        </a>
      </div>
      <p className="text-[0.9rem] leading-relaxed">평일 낮에 가요. 가기 전에 전화로 물어보면 좋아요.</p>
    </div>
  );
}

/** 탭 2에서 읽어 줄 말 */
export function placesSpeakText(items: ChecklistItem[]): string {
  return groupByPlace(items)
    .filter((b) => b.pending.length > 0)
    .map((b) => `${PLACE_LABEL[b.placeGroup].title}: ${b.pending.map((i) => i.docName).join(', ')}`)
    .join('. ');
}

export default function PlaceGroups({ items, place }: { items: ChecklistItem[]; place: Place }) {
  const blocks = groupByPlace(items);
  const active = blocks.filter((b) => b.pending.length > 0);
  const finished = blocks.filter((b) => b.pending.length === 0);

  return (
    <section className="flex flex-col gap-4">
      {active.map((b) => {
        const L = PLACE_LABEL[b.placeGroup];
        return (
          <div key={b.placeGroup} className="rounded-2xl border-2 border-ink bg-white p-4">
            <h3 className="text-[1.1rem] font-bold">
              <span aria-hidden="true">{L.icon}</span> {L.title}
            </h3>
            <ul className="mt-2 list-disc pl-6 text-[1rem] leading-relaxed">
              {b.pending.map((i) => (
                <li key={i.id}>{i.docName}</li>
              ))}
            </ul>
            <p className="mt-2 text-[0.9rem] leading-relaxed">{L.tip}</p>
            {b.placeGroup === 'bank' && (
              <p className="mt-1 text-[0.9rem] leading-relaxed">가까운 은행 창구에서 서류 이름을 그대로 말하면 돼요.</p>
            )}
            {b.placeGroup === 'gov24' && (
              <a href="https://www.gov.kr" target="_blank" rel="noopener noreferrer" className={btn.secondary + ' mt-3'}>
                정부24 열기
              </a>
            )}
            {(b.placeGroup === 'onsite' || b.placeGroup === 'gov24') && <OfficeLinks place={place} />}
          </div>
        );
      })}

      {finished.length > 0 && (
        <ul className="flex flex-col gap-1 text-[0.9rem]">
          {finished.map((b) => (
            <li key={b.placeGroup}>
              {PLACE_LABEL[b.placeGroup].icon} {PLACE_LABEL[b.placeGroup].title}: ✅ 다 챙겼어요
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
