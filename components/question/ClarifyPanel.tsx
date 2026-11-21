'use client'

export function ClarifyPanel({ question, utterance, options, onSelect, onRetry }: { question: string; utterance: string; options?: { label: string; value: string | number | boolean }[]; onSelect: (value: string | number | boolean) => void; onRetry: () => void }) {
  return <section className="grid gap-4 rounded-2xl border-2 border-orange-200 bg-white p-5"><p className="text-lg font-bold">지금 할 일: 한 번 더 대답해 주세요</p><p className="text-2xl font-bold">{question}</p><p>들은 말: &quot;{utterance}&quot;</p><div className="grid gap-3">{options?.map((option) => <button type="button" key={option.label} className="min-h-16 rounded-2xl border-2 border-orange-700 text-xl font-bold" onClick={() => onSelect(option.value)}>{option.label}</button>)}</div><button type="button" className="min-h-16 rounded-2xl border-2 border-slate-500 text-xl font-bold" onClick={onRetry}>처음 질문 다시 듣기</button></section>
}
