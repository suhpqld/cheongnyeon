'use client'

import { useState } from 'react'
import { BigButton } from '@/components/ui/BigButton'
import type { AnswerValue, FormField } from '@/lib/types'
import { CountButtons } from './CountButtons'
import { DistrictGrid } from './DistrictGrid'
import { MoneyInput } from './MoneyInput'

export function AnswerArea({ field, value, onAnswer }: { field: FormField; value?: AnswerValue; onAnswer: (value: AnswerValue) => void }) {
  if (field.type === 'yes_no') return <div className="grid grid-cols-2 gap-3"><BigButton onClick={() => onAnswer(true)}>예</BigButton><BigButton variant="secondary" onClick={() => onAnswer(false)}>아니오</BigButton></div>
  if (field.type === 'choice') return <div className="grid gap-3">{(field.options ?? []).map((option) => <BigButton key={option.value} variant="choice" onClick={() => onAnswer(option.value)}>{option.label}</BigButton>)}</div>
  if (field.type === 'district') return <DistrictGrid value={typeof value === 'string' ? value : undefined} onSelect={onAnswer} />
  if (field.type === 'count') return <CountButtons value={typeof value === 'number' ? value : undefined} min={field.minValue ?? 1} max={field.maxValue ?? 99} onSelect={onAnswer} />
  if (field.type === 'money') return <MoneyInput value={typeof value === 'number' ? value : undefined} max={field.maxValue ?? undefined} onConfirm={onAnswer} />
  return <TextInput value={typeof value === 'string' ? value : ''} onConfirm={onAnswer} />
}

function TextInput({ value, onConfirm }: { value: string; onConfirm: (value: string) => void }) {
  const [input, setInput] = useState(value)
  return <div className="grid gap-3"><textarea aria-label="답변" className="min-h-32 rounded-2xl border-2 border-orange-700 p-4 text-xl" value={input} onChange={(event) => setInput(event.target.value)} /><BigButton disabled={input.trim().length === 0} onClick={() => onConfirm(input.trim())}>확인</BigButton></div>
}
