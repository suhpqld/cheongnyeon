export function HardWords({ words }: { words: { word: string; easy: string }[] }) {
  if (!words.length) return null;
  return <section className="grid gap-2">
    <h2>어려운 말 풀이</h2>
    {words.map(({ word, easy }) => <p key={word} className="rounded-lg bg-white p-3">{word} → {easy}</p>)}
  </section>;
}
