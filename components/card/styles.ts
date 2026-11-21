// 04 화면 조각이 같이 쓰는 모양 (00의 13장 디자인 토큰)
// 01의 BigButton이 들어오면 큰 버튼은 BigButton으로 바꿔도 된다.

export const C = {
  bg: '#FFF8EE',
  ink: '#1F1A17',
  primary: '#B4500F',
  primarySoft: '#FFE3CC',
  ok: '#1E6B3A',
  warn: '#A11B1B',
};

const base =
  'inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[1rem] font-bold leading-snug ' +
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60';

export const btn = {
  primary: `${base} bg-primary text-white`,
  secondary: `${base} border-[3px] border-ink bg-white text-ink`,
  ok: `${base} border-[3px] border-ok bg-white text-ok`,
  small:
    'inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-ink bg-white px-3 py-2 text-[0.9rem] font-bold text-ink ' +
    'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink',
  link: 'text-[0.9rem] font-bold text-ink underline underline-offset-4 min-h-12 inline-flex items-center',
};

export const box = 'rounded-2xl border-2 border-ink bg-white p-4';
