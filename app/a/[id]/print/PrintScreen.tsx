'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import type { LocalValues } from '@/app/api/apps/[id]/print/form-values';
import type { PrintData } from '@/app/api/apps/[id]/print/route';
import { NO_SESSION_TEXT, RETRY_TEXT, useCardSession } from '@/components/card/useCardSession';
import { useScript } from '@/components/card/useScript';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { ACCEPT_NOTICE, FormPage, ReadyCardPage } from './PrintPages';

const input =
  'min-h-16 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-[1rem] focus-visible:outline focus-visible:outline-4 focus-visible:outline-ink';

// 인쇄할 때는 body 바로 아래 .print-root만 보이고, 1장과 2장이 한 쪽씩 나온다
const PRINT_CSS = `
  @page { size: A4; margin: 10mm; }
  .print-root { display: none; }
  @media print {
    html, body { background: #fff !important; }
    body > *:not(.print-root) { display: none !important; }
    .print-root { display: block; color: #000; }
    .print-root .print-page { break-after: page; break-inside: avoid; }
    .print-root .print-page:last-child { break-after: auto; }
    .print-root section, .print-root table { break-inside: avoid; }
  }
`;

/** 주민등록번호: 숫자만 받아서 앞 6자리 뒤에 - */
function formatRrn(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 13);
  return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
}

export default function PrintScreen({ appId }: { appId: string }) {
  const session = useCardSession(appId);
  const base = '/a/' + encodeURIComponent(appId);
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 이름, 주민등록번호, 전화번호는 이 화면 상태에만 둔다. 서버로 보내지도, 저장하지도 않는다.
  const [local, setLocal] = useState<Required<LocalValues>>({ name: '', rrn: '', phone: '' });

  useEffect(() => {
    if (typeof session !== 'object') return;
    let alive = true;
    apiFetch<PrintData>(`/api/apps/${encodeURIComponent(appId)}/print`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : RETRY_TEXT));
    return () => { alive = false; };
  }, [appId, session]);

  const { script } = useScript(appId, data, true);

  if (session === 'missing') {
    return (
      <AppShell back={{ href: '/' }} todo="이어서 하기 번호를 넣어 주세요">
        <div className="grid gap-3">
          <p>{NO_SESSION_TEXT}</p>
          <BigButton href="/resume">번호로 이어서 하기</BigButton>
        </div>
      </AppShell>
    );
  }

  const set = (k: keyof LocalValues) => (e: ChangeEvent<HTMLInputElement>) =>
    setLocal((v) => ({ ...v, [k]: k === 'rrn' ? formatRrn(e.target.value) : e.target.value }));

  const pages = data && (
    <>
      <FormPage data={data} local={local} />
      <ReadyCardPage data={data} script={script} />
    </>
  );

  return (
    <AppShell
      back={{ href: base + '/ready' }}
      todo="출력하거나 PDF로 저장해 주세요"
      speakText="출력하거나 PDF로 저장해 주세요"
      resumeCode={typeof session === 'object' ? session.resumeCode : null}
    >
      <style>{PRINT_CSS}</style>
      <div className="grid gap-4 pb-4">
        <h1>신청서 출력</h1>
        <p className="rounded-2xl border-[3px] border-ok bg-white p-4 font-bold leading-relaxed text-ok">✅ {ACCEPT_NOTICE}</p>

        <div className="grid gap-3 rounded-2xl border-2 border-ink bg-white p-4">
          <h2 className="text-[1.1rem] font-bold">신청서에 들어갈 개인 정보</h2>
          <label className="grid gap-1 font-bold">
            이름
            <input className={input} value={local.name} onChange={set('name')} autoComplete="off" />
          </label>
          <label className="grid gap-1 font-bold">
            주민등록번호
            <input
              className={input}
              value={local.rrn}
              onChange={set('rrn')}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000000-0000000"
            />
          </label>
          <label className="grid gap-1 font-bold">
            전화번호
            <input className={input} value={local.phone} onChange={set('phone')} inputMode="tel" autoComplete="off" />
          </label>
          <p className="text-[0.9rem] leading-relaxed">
            여기 적은 이름, 주민등록번호, 전화번호는 저장하지 않아요. 출력할 때만 들어가요. 비워 두고 주민센터에서 직접 적어도 돼요.
          </p>
        </div>

        <BigButton onClick={() => window.print()} disabled={!data}>
          🖨 출력하기
        </BigButton>
        <p className="text-[0.9rem]">PDF로 저장하려면 출력하기를 누른 뒤 프린터를 PDF로 저장으로 바꾸세요.</p>

        {error && <p role="alert" className="font-bold text-warn">{error}</p>}
        {!data && !error && <Loading text="신청서와 준비 카드를 만들고 있어요" />}
        {data && (
          <div className="grid gap-4">
            <h2 className="text-[1.1rem] font-bold">미리 보기 (1장 신청서, 2장 준비 카드)</h2>
            <div className="overflow-hidden rounded-xl border-2 border-ink">{pages}</div>
          </div>
        )}

        <BigButton href={base + '/visit'} icon="🏢" variant="secondary">
          주민센터에 다녀왔어요
        </BigButton>
        <Disclaimer />
      </div>
      {data && typeof document !== 'undefined' && createPortal(<div className="print-root">{pages}</div>, document.body)}
    </AppShell>
  );
}
