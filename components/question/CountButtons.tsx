'use client'

import { useState } from 'react'
import { BigButton } from '@/components/ui/BigButton'
import { NumberPad } from '@/components/ui/NumberPad'

export function CountButtons({ value, min = 1, max = 99, onSelect }: { value?: number; min?: number; max?: number; onSelect: (value: number) => void }) {
  const [custom, setCustom] = useState(false)
  const [input, setInput] = useState(value && value >= 5 ? String(value) : '')
  const counts = [1, 2, 3, 4].filter((count) => count >= min && count <= max)
  if (custom) return <NumberPad mode="count" value={input} onChange={setInput} onSubmit={(count) => { onSelect(Math.min(count, max)); setCustom(false) }} />
  return <div className="grid gap-3">{counts.map((count) => <BigButton key={count} selected={value === count} variant={value === count ? 'primary' : 'secondary'} onClick={() => onSelect(count)}>{count === 1 ? '1명 (혼자)' : `${count}명`}</BigButton>)}{max >= 5 && <BigButton variant="secondary" onClick={() => setCustom(true)}>5명 이상</BigButton>}</div>
}
