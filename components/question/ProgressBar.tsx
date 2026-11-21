export function ProgressBar({ index, total }: { index: number; total: number }) {
  const percent = total === 0 ? 0 : Math.min(100, Math.round((index / total) * 100))
  return <div aria-label={`${index}번째 질문 / 모두 ${total}개`} className="grid gap-2"><div className="flex justify-between text-base font-bold"><span>{index}번째 질문</span><span>모두 {total}개</span></div><div className="h-3 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-700" style={{ width: `${percent}%` }} /></div></div>
}
