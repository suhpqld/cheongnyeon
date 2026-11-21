import type { ReactNode } from 'react';

export function SpeechBubble({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-primary-soft p-3">{children}</div>;
}

export default SpeechBubble;
