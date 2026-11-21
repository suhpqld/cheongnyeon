'use client';

import { useState } from 'react';
import { BigButton } from '@/components/ui/BigButton';
import { ddayFrom, ddayLabel, formatDateKo, todayKST } from '@/lib/format';
import { validDate } from '@/lib/ai/supplement-schema';
import { OriginalQuote } from './OriginalQuote';

export function DeadlineConfirm({ deadline, original, confirmed, onConfirm, busy }: {
  deadline: string | null;
  original: string | null;
  confirmed: boolean;
  onConfirm: (deadline?: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const initial = deadline ?? todayKST();
  const [year, setYear] = useState(initial.slice(0, 4));
  const [month, setMonth] = useState(initial.slice(5, 7));
  const [day, setDay] = useState(initial.slice(8, 10));
  const chosen = `${year}-${month}-${day}`;
  const years = [Number(todayKST().slice(0, 4)) - 1, Number(todayKST().slice(0, 4)), Number(todayKST().slice(0, 4)) + 1];

  return <section className="grid gap-3 rounded-xl border-[3px] border-dashed border-line bg-primary-soft p-4">
    {confirmed && deadline ? <>
      <p className="text-center text-[38px] font-black leading-tight">{formatDateKo(deadline)}까지</p>
      <p className="text-center text-[32px] font-bold">{ddayLabel(ddayFrom(deadline)).text}</p>
    </> : <>
      <h2>종이에 적힌 날짜와 같은지 확인해 주세요</h2>
      {original && <OriginalQuote>{original}</OriginalQuote>}
      {deadline ? <p className="text-center text-[38px] font-black">{formatDateKo(deadline)}</p>
        : <p>기한이 안 보여요. 종이를 보고 날짜를 넣어 주세요.</p>}
      {deadline && !editing && <BigButton disabled={busy} onClick={() => onConfirm()}>✅ 맞아요</BigButton>}
      <BigButton variant="secondary" onClick={() => setEditing(value => !value)}>📅 날짜 고치기</BigButton>
      {editing && <>
        <div className="grid grid-cols-3 gap-2">
          <label>년<select aria-label="년" value={year} onChange={event => setYear(event.target.value)} className="w-full rounded-lg border-2 p-2">
            {years.map(value => <option key={value} value={value}>{value}년</option>)}
          </select></label>
          <label>월<select aria-label="월" value={month} onChange={event => setMonth(event.target.value)} className="w-full rounded-lg border-2 p-2">
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map(value => <option key={value} value={value}>{Number(value)}월</option>)}
          </select></label>
          <label>일<select aria-label="일" value={day} onChange={event => setDay(event.target.value)} className="w-full rounded-lg border-2 p-2">
            {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map(value => <option key={value} value={value}>{Number(value)}일</option>)}
          </select></label>
        </div>
        <BigButton disabled={busy || !validDate(chosen)} onClick={() => onConfirm(chosen)}>이 날짜로 할게요</BigButton>
      </>}
      {!deadline && <p>기한이 없으면 주민센터에 물어보세요.</p>}
    </>}
  </section>;
}
