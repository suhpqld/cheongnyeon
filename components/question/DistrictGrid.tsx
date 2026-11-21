'use client'

import { SEOUL_DISTRICTS } from '@/lib/rules/form'

export function DistrictGrid({ value, onSelect }: { value?: string; onSelect: (value: string) => void }) {
  return <div className="grid grid-cols-3 gap-2">{SEOUL_DISTRICTS.map((district) => <button type="button" key={district} aria-pressed={value === district} className={`min-h-14 rounded-xl border-2 px-2 text-lg font-bold ${value === district ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-200 bg-white'}`} onClick={() => onSelect(district)}>{district}</button>)}<button type="button" className="col-span-3 min-h-14 rounded-xl border-2 border-slate-500 px-2 text-lg font-bold" onClick={() => onSelect('서울 외')}>서울에 안 살아요</button></div>
}
