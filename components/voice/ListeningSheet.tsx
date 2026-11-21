'use client';

import { Boknyang } from '@/components/ui/Boknyang';

interface ListeningSheetProps {
  interim: string;
  onStop: () => void;
}

/** 듣는 중 큰 화면: 화면 아래 절반을 덮는다 */
export function ListeningSheet({ interim, onStop }: ListeningSheetProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="듣고 있어요"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex min-h-[50dvh] w-full max-w-[480px] flex-col items-center gap-3 rounded-t-3xl border-t-[3px] border-ink bg-white px-4 pb-5 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.15)]"
    >
      <style>{`
        @keyframes boknyang-bar { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        .boknyang-bar { animation: boknyang-bar 0.9s ease-in-out infinite; transform-origin: bottom; }
      `}</style>
      <Boknyang mood="listening" size="sm" />
      <p className="text-[2rem] font-bold leading-tight" aria-live="polite">
        듣고 있어요
      </p>
      <div className="flex h-10 items-end gap-2" aria-hidden="true">
        {[0, 0.15, 0.3].map((d) => (
          <span key={d} className="boknyang-bar block h-10 w-3 rounded-full bg-primary" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
      <p className="min-h-[3.2rem] w-full text-center text-[1.2rem] leading-snug" aria-live="polite">
        {interim}
      </p>
      <p className="text-center text-[0.9rem]">다 말하면 다 말했어요를 눌러 주세요.</p>
      <button
        type="button"
        onClick={onStop}
        className="mt-auto flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-primary bg-primary px-3 font-bold text-white"
      >
        <span aria-hidden="true">■</span> 다 말했어요
      </button>
    </div>
  );
}

export default ListeningSheet;
