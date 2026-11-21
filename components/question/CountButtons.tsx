'use client'

export function CountButtons({ value, min = 1, max = 99, onSelect }: { value?: number; min?: number; max?: number; onSelect: (value: number) => void }) {
  const counts = [1, 2, 3, 4].filter((count) => count >= min && count <= max)
  return <div className="grid gap-3">{counts.map((count) => <button type="button" key={count} aria-pressed={value === count} className="min-h-16 rounded-2xl border-2 border-orange-700 px-4 text-left text-xl font-bold" onClick={() => onSelect(count)}>{count === 1 ? '1명 (혼자)' : `${count}명`}</button>)}{max >= 5 && <button type="button" className="min-h-16 rounded-2xl border-2 border-orange-700 px-4 text-left text-xl font-bold" onClick={() => onSelect(5)}>5명 이상</button>}</div>
}
