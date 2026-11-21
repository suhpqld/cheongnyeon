'use client'

import { useState } from 'react'
import { BigButton } from '@/components/ui/BigButton'

// 같이 사는 사람 고르기 (여러 명). 답은 글로 저장: "아들, 손녀, 기타(조카)"
export const MEMBER_OPTIONS = ['배우자', '아들', '딸', '며느리', '사위', '손자', '손녀', '아버지', '어머니', '형제자매'] as const

const ETC = '기타'
const input = 'min-h-16 w-full rounded-xl border-[3px] border-line bg-white px-3 text-xl'

/** 저장된 글을 다시 고른 상태로: 아는 이름은 버튼, 나머지는 기타 칸 */
export function parseMembers(value: string | undefined): { picked: string[]; etc: string } {
  const parts = (value ?? '').split(',').map((part) => part.trim()).filter(Boolean)
  const picked = parts.filter((part) => (MEMBER_OPTIONS as readonly string[]).includes(part))
  // 기타 칸 안에 쉼표가 있어도 되게 나머지를 다시 이어 붙인 뒤 "기타(...)"를 벗긴다
  const etc = parts
    .filter((part) => !picked.includes(part))
    .join(', ')
    .replace(/^기타\s*\((.*)\)$/, '$1')
  return { picked, etc }
}

export function joinMembers(picked: string[], etc: string): string {
  const ordered = MEMBER_OPTIONS.filter((option) => picked.includes(option))
  const extra = etc.trim()
  return [...ordered, ...(extra ? [`${ETC}(${extra})`] : [])].join(', ')
}

export function MemberPicker({ value, others, onConfirm }: { value?: string; others: number | null; onConfirm: (value: string) => void }) {
  const initial = parseMembers(value)
  const [picked, setPicked] = useState<string[]>(initial.picked)
  const [etcOpen, setEtcOpen] = useState(initial.etc.length > 0)
  const [etc, setEtc] = useState(initial.etc)

  const toggle = (option: string) =>
    setPicked((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])
  const answer = joinMembers(picked, etcOpen ? etc : '')

  return <div className="grid gap-3">
    <p className="font-bold">
      해당하는 사람을 모두 눌러 주세요.{others && others > 0 ? ` (신청하시는 분 말고 ${others}명)` : ''}
    </p>
    <div className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-3" role="group" aria-label="같이 사는 사람">
      {MEMBER_OPTIONS.map((option) => <BigButton key={option} variant="choice" selected={picked.includes(option)} onClick={() => toggle(option)}>{option}</BigButton>)}
      <BigButton variant="choice" selected={etcOpen} onClick={() => setEtcOpen((open) => !open)}>{ETC}</BigButton>
    </div>
    {etcOpen && <label className="grid gap-1 font-bold">
      기타 (누구인지 적어 주세요)
      <input className={input} value={etc} onChange={(event) => setEtc(event.target.value)} placeholder="예: 조카, 같이 사는 친구" autoComplete="off" maxLength={40} />
    </label>}
    {answer && <p>고른 사람: <b>{answer}</b></p>}
    <BigButton disabled={answer.length === 0} onClick={() => onConfirm(answer)}>확인</BigButton>
  </div>
}
