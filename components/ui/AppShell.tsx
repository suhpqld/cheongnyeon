'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useViewMode } from '@/lib/client/settings';
import { formatCode } from '@/lib/format';
import { ConfirmModal } from './ConfirmModal';
import { StepBar } from './StepBar';

interface AppShellProps {
  children: ReactNode;
  back?: { href: string } | { onClick: () => void } | null;
  showHome?: boolean;
  todo?: string | null;
  /** 예전 읽어 주기용. 음성 기능을 뺐으므로 받기만 하고 쓰지 않는다 */
  speakText?: string | null;
  resumeCode?: string | null;
  plain?: boolean;
  /** 신청 준비 5단계 중 지금 단계 (0부터). 없으면 단계 표시 안 함 */
  step?: number;
  /** PC 화면에서 넓게 (2열 배치가 있는 화면). 없으면 PC에서도 760px 폭으로 가운데 */
  wide?: boolean;
}

const controlStyle = 'flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-[max(16px,0.8rem)] font-bold text-ink';
const toolStyle = controlStyle + ' border border-hair bg-white';

export function AppShell({ children, back, showHome = true, todo, resumeCode, plain, step, wide }: AppShellProps) {
  const router = useRouter();
  const [confirmHome, setConfirmHome] = useState(false);
  const { view, setView } = useViewMode();

  return <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-3 pc:max-w-[1140px] pc:px-8">
    {!plain && <>
      <header className="-mx-3 flex min-h-14 items-center justify-between gap-2 border-b border-[#e4eaf5] bg-white/90 px-3 pc:-mx-8 pc:min-h-[74px] pc:px-8">
        {showHome
          ? <button type="button" className="flex min-h-12 items-center gap-2 text-left" aria-label="복냥이 처음 화면" onClick={() => setConfirmHome(true)}>
              <Brand />
            </button>
          : <div className="flex min-h-12 items-center gap-2"><Brand /></div>}
      </header>
      {back && <div className="pt-1">{'href' in back
        ? <Link href={back.href} className={controlStyle + ' inline-flex text-primary-dark underline underline-offset-4'}>← 뒤로</Link>
        : <button type="button" className={controlStyle + ' text-primary-dark underline underline-offset-4'} onClick={back.onClick}>← 뒤로</button>}</div>}
      {step !== undefined && <StepBar current={step} />}
      {todo && <p className="notice mt-1 font-bold"><span className="text-primary-dark">지금 할 일</span> · {todo}</p>}
      <ConfirmModal open={confirmHome} title="처음 화면으로 갈까요?" body="쓴 내용은 저장돼 있어요."
        confirmLabel="네, 갈게요" cancelLabel="아니요" onCancel={() => setConfirmHome(false)}
        onConfirm={() => { setConfirmHome(false); router.push('/'); }} />
    </>}
    <main className={'flex-1 py-3 ' + (wide ? '' : 'pc:mx-auto pc:w-full pc:max-w-[760px]')}>{children}</main>
    {!plain && <footer className="grid gap-2 pb-4 text-center pc:grid-cols-2">
      {resumeCode && <p className={toolStyle + ' w-full'}>이어서 하기 번호 {formatCode(resumeCode)}</p>}
      {view && <button type="button" className={toolStyle + ' w-full ' + (resumeCode ? '' : 'pc:col-span-2')}
        onClick={() => setView(view === 'pc' ? 'mobile' : 'pc')}>
        {view === 'pc' ? '📱 모바일 화면으로 보기' : '🖥 PC 화면으로 보기'}
      </button>}
    </footer>}
  </div>;
}

function Brand() {
  return <>
    <span aria-hidden="true" className="grid size-8 place-items-center rounded-[10px] bg-primary text-white">✦</span>
    <strong className="text-[1.2rem] tracking-tight">복냥이</strong>
    <span className="hidden border-l border-hair pl-2 text-[max(15px,0.75rem)] text-muted min-[400px]:inline pc:inline">복지 신청 준비</span>
  </>;
}

export default AppShell;
