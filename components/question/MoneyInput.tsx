'use client'

import { useState } from 'react'

export function MoneyInput({ value, max, onConfirm }: { value?: number; max?: number; onConfirm: (value: number) => void }) {
  const [input, setInput] = useState(value === undefined ? '' : String(Math.round(value / 10000)))
  const amount = Number(input) * 10000
  return <div className="grid gap-3"><div className="rounded-2xl bg-white p-5 text-center text-3xl font-bold">{input ? `${Number(input).toLocaleString('ko-KR')}만 원` : '금액을 눌러 주세요'}</div><input inputMode="numeric" aria-label="금액(만원)" className="min-h-16 rounded-2xl border-2 border-orange-700 px-4 text-center text-2xl" value={input} onChange={(event) => setInput(event.target.value.replace(/[^0-9]/g, ''))} /><button type="button" className="min-h-16 rounded-2xl bg-orange-700 text-xl font-bold text-white" disabled={!Number.isInteger(amount) || (max !== undefined && amount > max)} onClick={() => onConfirm(amount)}>확인</button><button type="button" className="min-h-16 rounded-2xl border-2 border-orange-700 text-xl font-bold" onClick={() => onConfirm(0)}>없어요 (0원)</button></div>
}
