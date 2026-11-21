type Mood = 'idle' | 'listening' | 'thinking' | 'happy';
type Size = 'sm' | 'md' | 'lg';
const sizes: Record<Size, number> = { sm: 64, md: 120, lg: 180 };

export function Boknyang({ mood = 'idle', size = 'md' }: { mood?: Mood; size?: Size }) {
  const ears = mood === 'listening' ? 'M26 52 18 10Q36 9 50 28 M94 52 102 10Q84 9 70 28' :
    'M26 52 20 17Q36 13 50 30 M94 52 100 17Q84 13 70 30';
  return <object data={'/boknyang/' + mood + '.png'} type="image/png" width={sizes[size]} height={sizes[size]} aria-label="복냥이"><svg role="img" aria-label="복냥이" viewBox="0 0 120 120" width={sizes[size]} height={sizes[size]}>
    <path d={ears} stroke="#1f1a17" strokeWidth="4" fill="#ffc076" strokeLinejoin="round" />
    <rect x="15" y="25" width="90" height="65" rx="33" fill="#ffc076" stroke="#1f1a17" strokeWidth="4" />
    <path d="M25 63h12m-10 8 10-3m58-5H83m10 8-10-3" stroke="#1f1a17" strokeWidth="2" strokeLinecap="round" />
    {mood === 'happy' ? <path d="M39 53q6-9 12 0m18 0q6-9 12 0" fill="none" stroke="#1f1a17" strokeWidth="3" /> :
      <g fill="#1f1a17"><ellipse cx="45" cy="52" rx="3" ry={mood === 'listening' ? 6 : 4} />
        <ellipse cx="75" cy="52" rx="3" ry={mood === 'thinking' ? 2 : 4} /></g>}
    <path d="m55 60 5 4 5-4z" fill="#81320b" />
    {mood === 'listening' ? <circle cx="60" cy="72" r="4" fill="#81320b" /> :
      <path d={mood === 'thinking' ? 'M57 72h7' : 'M51 69q4 7 9 0 5 7 9 0'} fill="none" stroke="#81320b" strokeWidth="2.5" />}
    <circle cx="60" cy="99" r="14" fill="#ffe481" stroke="#1f1a17" strokeWidth="3" />
    <text x="60" y="105" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1a17">복</text>
  </svg></object>;
}

export default Boknyang;
