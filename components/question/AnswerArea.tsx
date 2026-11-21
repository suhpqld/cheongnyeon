'use client'

import { useState } from 'react'
import { CountButtons } from './CountButtons'
import { DistrictGrid } from './DistrictGrid'
import { MoneyInput } from './MoneyInput'

type Option = { value: string; label: string }
type Field = { type: 'yes_no' | 'choice' | 'district' | 'count' | 'money' | 'text'; options?: Option[] | null; minValue?: number | null; maxValue?: number | null }

export function AnswerArea({ field, value, onAnswer }: { field: Field; value?: string | number | boolean; onAnswer: (value: string | number | boolean) => void }) {
  if (field.type === 'yes_no') return <div className="grid grid-cols-2 gap-3"><button className="min-h-16 rounded-2xl bg-orange-700 px-4 text-xl font-bold text-white" onClick={() => onAnswer(true)}>예</button><button className="min-h-16 rounded-2xl border-2 border-orange-700 px-4 text-xl font-bold" onClick={() => onAnswer(false)}>아니오</button></div>
  if (field.type === 'choice') return <div className="grid gap-3">{(field.options ?? []).map((option) => <button key={option.value} className="min-h-16 rounded-2xl border-2 border-orange-700 px-4 text-left text-xl font-bold" onClick={() => onAnswer(option.value)}>{option.label}</button>)}</div>
  if (field.type === 'district') return <DistrictGrid value={typeof value === 'string' ? value : undefined} onSelect={onAnswer} />
  if (field.type === 'count') return <CountButtons value={typeof value === 'number' ? value : undefined} min={field.minValue ?? 1} max={field.maxValue ?? 99} onSelect={onAnswer} />
  if (field.type === 'money') return <MoneyInput value={typeof value === 'number' ? value : undefined} max={field.maxValue ?? undefined} onConfirm={onAnswer} />
  return <TextInput value={typeof value === 'string' ? value : ''} onConfirm={onAnswer} />
}

function TextInput({ value, onConfirm }: { value: string; onConfirm: (value: string) => void }) {
  const [input, setInput] = useState(value)
  return <div className="grid gap-3"><textarea aria-label="답변" className="min-h-32 rounded-2xl border-2 border-orange-700 p-4 text-xl" value={input} onChange={(event) => setInput(event.target.value)} /><button type="button" className="min-h-16 rounded-2xl bg-orange-700 text-xl font-bold text-white" disabled={input.trim().length === 0} onClick={() => onConfirm(input.trim())}>확인</button></div>
}
