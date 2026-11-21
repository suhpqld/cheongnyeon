'use client'

export function ReviewRow({ label, value, needsCheck, onEdit }: { label: string; value: string; needsCheck?: boolean; onEdit: () => void }) {
  return <div className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-4 ${needsCheck ? 'border-yellow-600' : 'border-orange-100'}`}><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-700">{label}</p><p className="text-xl font-bold break-words">{value}</p>{needsCheck && <p className="font-bold text-yellow-800">⚠ 확인 필요</p>}</div><button type="button" className="min-h-12 rounded-xl border-2 border-orange-700 px-4 font-bold" onClick={onEdit}>고치기</button></div>
}
