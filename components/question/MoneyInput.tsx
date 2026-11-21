'use client'

import { useState } from 'react'
import { NumberPad } from '@/components/ui/NumberPad'
import { BigButton } from '@/components/ui/BigButton'

export function MoneyInput({ value, max, onConfirm }: { value?: number; max?: number; onConfirm: (value: number) => void }) {
  const initialValue = value === undefined ? '' : String(Math.round(value / 10000))
  return <MoneyPad initialValue={initialValue} max={max} onConfirm={onConfirm} />
}

function MoneyPad({ initialValue, max, onConfirm }: { initialValue: string; max?: number; onConfirm: (value: number) => void }) {
  const [input, setInput] = useState(initialValue)
  return <div className="grid gap-3"><NumberPad mode="money" value={input} onChange={setInput} onSubmit={(amount) => { if (max === undefined || amount <= max) onConfirm(amount) }} /><BigButton variant="secondary" onClick={() => onConfirm(0)}>없어요 (0원)</BigButton></div>
}
