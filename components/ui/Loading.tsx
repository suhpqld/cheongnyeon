'use client';

import { useEffect, useState } from 'react';
import { Boknyang } from './Boknyang';

export function Loading({ text }: { text: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return <div role="status" className="grid justify-items-center gap-3 text-center">
    <Boknyang mood="thinking" />
    <p>{text}</p>
    {slow && <p>조금만 더 기다려 주세요</p>}
  </div>;
}

export default Loading;
