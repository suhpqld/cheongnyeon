'use client'

import { SEOUL_DISTRICTS } from '@/lib/rules/form'
import { BigButton } from '@/components/ui/BigButton'

export function DistrictGrid({ value, onSelect }: { value?: string; onSelect: (value: string) => void }) {
  return <div className="grid grid-cols-3 gap-2">{SEOUL_DISTRICTS.map((district) => <BigButton key={district} variant={value === district ? 'primary' : 'secondary'} selected={value === district} onClick={() => onSelect(district)}>{district}</BigButton>)}<BigButton variant="secondary" onClick={() => onSelect('서울 외')}>서울에 안 살아요</BigButton></div>
}
