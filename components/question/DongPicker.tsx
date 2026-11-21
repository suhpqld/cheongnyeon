'use client'

import { useState } from 'react'
import { BigButton } from '@/components/ui/BigButton'
import { SEOUL_DONGS } from './seoul-dongs'

const input = 'min-h-16 w-full rounded-xl border-[3px] border-line bg-white px-3 text-xl'

/** 고른 구의 행정동 목록에서 고르기. 목록에 없거나 구를 모르면 직접 적기 */
export function DongPicker({ district, value, onSelect }: { district: string | null; value?: string; onSelect: (value: string) => void }) {
  const dongs = district ? SEOUL_DONGS[district] : undefined
  const inList = !!value && !!dongs?.includes(value)
  const [typing, setTyping] = useState(!dongs || (!!value && !inList))
  const [text, setText] = useState(value && !inList ? value : '')

  if (typing || !dongs) {
    return <div className="grid gap-3">
      <label className="grid gap-1 font-bold">
        동 이름
        <input className={input} value={text} onChange={(event) => setText(event.target.value)} placeholder="예: 상계1동" autoComplete="off" />
      </label>
      <BigButton disabled={text.trim().length === 0} onClick={() => onSelect(text.trim())}>확인</BigButton>
      {dongs && <BigButton variant="secondary" onClick={() => setTyping(false)}>{district} 동 목록에서 고르기</BigButton>}
    </div>
  }

  return <div className="grid gap-3">
    <p className="font-bold">{district}의 동 {dongs.length}개 중에서 골라 주세요.</p>
    <div className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-3">
      {dongs.map((dong) => <BigButton key={dong} variant={value === dong ? 'primary' : 'secondary'} selected={value === dong} onClick={() => onSelect(dong)}>{dong}</BigButton>)}
    </div>
    <BigButton variant="secondary" icon="✏️" onClick={() => setTyping(true)}>목록에 없어요, 직접 적을게요</BigButton>
  </div>
}
