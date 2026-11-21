'use client';

import Image from 'next/image';
import { Suspense, use, useEffect, useState } from 'react';
import { StageTracker } from '@/components/status/StageTracker';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { speak, stopSpeaking, useSpeaking } from '@/lib/client/tts';
import { ddayLabel, formatDateKo } from '@/lib/format';
import { displaySeoulDate, type SharedView } from '@/lib/rules/progress';

type Props = { params: Promise<{ code: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<AppShell plain><Loading text="가족이 보낸 목록을 불러오고 있어요" /></AppShell>}>
    <Screen {...props} />
  </Suspense>;
}

function Screen({ params }: Props) {
  const { code } = use(params);
  return <FamilyView key={code} code={code} />;
}

function FamilyView({ code }: { code: string }) {
  const [view, setView] = useState<SharedView | null>(null);
  const [error, setError] = useState<{ message: string; expired: boolean } | null>(null);
  const [request, setRequest] = useState(0);
  const reading = useSpeaking();

  useEffect(() => {
    let active = true;
    let pending: AbortController | undefined;

    async function load() {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      try {
        const response = await fetch('/api/share/' + encodeURIComponent(code), {
          cache: 'no-store', signal: controller.signal, referrerPolicy: 'no-referrer',
        });
        const data = await response.json();
        if (!active || controller.signal.aborted) return;
        if (!response.ok) {
          setView(null);
          setError({ message: data.message ?? '공유 화면을 불러오지 못했어요.', expired: response.status === 404 });
        } else {
          setError(null);
          setView(data);
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setView(null);
          setError({ message: '가족이 보낸 목록을 불러오지 못했어요.', expired: false });
        }
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void load();
    }

    void load();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      pending?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopSpeaking();
    };
  }, [code, request]);

  if (error || !view) return <AppShell plain>
    <div className="grid gap-3">
      <h1>가족이 공유한 신청 준비</h1>
      {error ? <>
        <p className="rounded-xl border-2 border-warn bg-white p-3 text-warn" role="alert">{error.message}</p>
        {!error.expired && <BigButton onClick={() => { setError(null); setRequest(value => value + 1); }}>다시 열기</BigButton>}
      </> : <Loading text="가족이 보낸 목록을 불러오고 있어요" />}
    </div>
  </AppShell>;

  const { checklist, supplement } = view;
  const pending = checklist.filter(item => !item.isDone);
  const ordered = [...pending, ...checklist.filter(item => item.isDone)];
  const deadlineText = supplement?.deadline ? formatDateKo(supplement.deadline) + '까지' : null;
  const remainingTime = supplement?.dday != null ? ddayLabel(supplement.dday).text : null;
  const intro = view.district ? view.district + '에 사시는 가족이 보낸 신청 준비예요.' : '가족이 보낸 신청 준비예요.';
  const speech = [
    intro, view.programName, '보기만 할 수 있는 화면이에요.',
    ...(supplement ? ['추가로 챙길 서류.', deadlineText, remainingTime, ...supplement.items.map(item => item.easyName)] : []),
    ...(pending.length ? ['챙길 서류.', ...pending.map(item => item.docName + '. ' + item.placeTitle)] : []),
  ].filter(Boolean).join(' ');

  return (
    <AppShell plain>
      <div className="grid gap-4 text-ink print:gap-2">
        <p className="rounded-xl bg-primary-soft p-3"><strong>{intro}</strong> 보기만 할 수 있어요.</p>
        <div className="flex items-center gap-3">
          <Image src="/boknyang/laptop.png" alt="" width={88} height={88} unoptimized className="shrink-0 object-contain" />
          <div>
            <h1>가족이 공유한 신청 준비</h1>
            <p className="mt-1 font-bold">{view.programName}</p>
          </div>
        </div>
        <StageTracker status={view.status} docsReady={view.docsReady} submittedAt={view.submittedAt}
          supplementDday={supplement?.dday ?? null} />
        {supplement && <section aria-labelledby="shared-extra" className="grid gap-2 rounded-2xl border-[3px] border-warn bg-white p-3">
          <h2 id="shared-extra">추가로 챙길 서류</h2>
          {deadlineText ? <p className="text-2xl font-bold text-warn">{deadlineText}</p>
            : <p className="font-bold">제출 날짜는 받은 종이와 함께 확인해 주세요.</p>}
          {remainingTime && <p className="font-bold">{remainingTime}</p>}
          <ul className="grid gap-2">
            {supplement.items.map((item, index) => <li key={index}>
              <strong>{item.easyName}</strong><p>{item.issuePlace}</p>
            </li>)}
          </ul>
        </section>}
        {view.familyHelpNeeded && <p className="rounded-xl bg-primary-soft p-3 font-bold">
          가족분 서명이 필요한 서류가 있을 수 있어요. 연락해서 같이 챙겨 주세요.
        </p>}
        <section aria-labelledby="shared-documents" className="grid gap-3">
          <h2 id="shared-documents">챙길 서류</h2>
          {ordered.length === 0 ? <p>정리된 서류 목록이 아직 없어요.</p>
            : <ul className="grid gap-2">
              {ordered.map((item, index) => <li key={index} className="rounded-xl border border-primary/25 bg-white p-3">
                <p className="font-bold">{item.docName}</p>
                <p>{item.placeTitle}</p>
                <p className={'font-bold ' + (item.isDone ? 'text-ok' : '')}>
                  {item.isDone ? '✓ 챙겼어요' : '아직 챙겨야 해요'}
                </p>
                {item.dueDate && <p className="text-warn">{formatDateKo(item.dueDate)}까지</p>}
              </li>)}
            </ul>}
        </section>
        <p>서류를 같이 떼거나 주민센터에 함께 가 주세요.</p>
        <p>이 링크는 {displaySeoulDate(view.expiresAt)}까지 열려요.</p>
        <div className="grid gap-3 print:hidden">
          <BigButton onClick={() => window.print()} variant="secondary">🖨 출력하기</BigButton>
        </div>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
