import Image from 'next/image';

type Mood = 'idle' | 'listening' | 'thinking' | 'happy';
type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, number> = { sm: 64, md: 120, lg: 180 };

export function Boknyang({ mood = 'idle', size = 'md' }: { mood?: Mood; size?: Size }) {
  return (
    <Image
      src={'/boknyang/' + mood + '.png'}
      alt="복냥이"
      width={sizes[size]}
      height={sizes[size]}
      unoptimized
    />
  );
}

export default Boknyang;
