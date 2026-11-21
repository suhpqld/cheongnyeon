export function OriginalQuote({ children }: { children: string }) {
  return <blockquote className="rounded-lg border-2 border-line bg-white p-3">
    <strong className="block">📄 종이에 적힌 말</strong>
    <p className="mt-1 whitespace-pre-wrap">“{children}”</p>
  </blockquote>;
}
