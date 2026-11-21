'use client';

import { useEffect, useState } from 'react';
import type { CardData } from '@/app/api/apps/[id]/card/load';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { todayKST } from '@/lib/format';
import PrintSheet from './PrintSheet';
import { NO_SESSION_TEXT, RETRY_TEXT, useCardSession } from './useCardSession';
import { useScript } from './useScript';

const field =
  'min-h-16 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-[1rem] focus-visible:outline focus-visible:outline-4 focus-visible:outline-ink';

export default function PrintScreen({ appId }: { appId: string }) {
  const session = useCardSession(appId);
  const base = '/a/' + encodeURIComponent(appId);
  const [data, setData] = useState<CardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 이름, 전화번호는 화면 상태에만 둔다. 저장하지 않는다.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (typeof session !== 'object') return;
    let alive = true;
    apiFetch<CardData>(`/api/apps/${encodeURIComponent(appId)}/card?include=print`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : RETRY_TEXT));
    return () => { alive = false; };
  }, [appId, session]);

  const { script } = useScript(appId, data, true);

  if (session === 'missing') {
    return (
      <AppShell back={{ href: base + '/card' }} todo="이어서 하기 번호를 넣어 주세요">
        <div className="grid gap-3">
          <p>{NO_SESSION_TEXT}</p>
          <BigButton href="/resume">번호로 이어서 하기</BigButton>
        </div>
      </AppShell>
    );
  }

  const sup = data?.activeSupplement ?? null;
  const supNames = sup && data ? data.checklist.filter((i) => i.supplementId === sup.id).map((i) => i.docName) : [];

  return (
    <AppShell
      back={{ href: base + '/card' }}
      todo="출력하거나 PDF로 저장해 주세요"
      speakText="출력하거나 PDF로 저장해 주세요"
      resumeCode={typeof session === 'object' ? session.resumeCode : null}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 print:hidden">
          <h1>옮겨 쓰는 카드</h1>
          <BigButton onClick={() => window.print()} disabled={!data}>
            🖨 출력하기
          </BigButton>
          <p className="text-[0.9rem]">PDF로 저장하려면 출력하기를 누른 뒤 프린터를 PDF로 저장으로 바꾸세요.</p>
          <label className="grid gap-1 font-bold">
            이름
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </label>
          <label className="grid gap-1 font-bold">
            전화번호
            <input
              className={field}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="off"
            />
          </label>
          <p className="text-[0.9rem]">적은 이름과 전화번호는 저장하지 않아요. 출력할 때만 들어가요.</p>
        </div>

        {error && <p role="alert" className="font-bold text-warn">{error}</p>}
        {!data && !error && <Loading text="옮겨 쓰는 카드를 만들고 있어요" />}
        {data && (
          <PrintSheet
            today={todayKST()}
            name={name}
            phone={phone}
            sections={data.print ?? []}
            checklist={data.checklist}
            supplement={sup ? { deadline: sup.deadline, names: supNames } : null}
            script={script}
          />
        )}
      </div>
    </AppShell>
  );
}
