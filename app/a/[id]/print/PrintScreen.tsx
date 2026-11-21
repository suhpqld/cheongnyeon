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

const LOCAL_LABEL: Record<string, string> = {
  name: '이름', rrn: '주민등록번호', phone: '전화번호', mobile: '휴대전화', email: '이메일',
  address: '주소', real_address: '실제 사는 곳 (등본 주소와 다를 때만)', workplace: '직장 이름',
  owner_name: '예금주 이름', number: '계좌번호', year: '년', month: '월', day: '일',
};

interface LocalGroup { title: string; keys: string[] }

/** 양식 칸의 local_key로 입력칸 묶음을 만든다. 묶음 답은 줄 수만큼만 */
function localGroups(data: PrintData): LocalGroup[] {
  const keys: string[] = [];
  for (const t of data.templates) for (const s of t.slots) if (s.localKey && !keys.includes(s.localKey)) keys.push(s.localKey);
  const groups = new Map<string, LocalGroup>();
  const titleOf = (k: string): string | null => {
    const [root, n] = k.split('.');
    if (root === 'applicant') return '신청인';
    if (root === 'members') return Number(n) <= (data.groupCounts.members ?? 0) ? `같이 사는 가족 ${n}` : null;
    if (root === 'supporters') return Number(n) <= (data.groupCounts.supporters ?? 0) ? `따로 사는 부모, 자녀 ${n}` : null;
    if (root === 'account') return '돈 받을 통장';
    if (root === 'visit') return '신청하는 날 (주민센터 가는 날)';
    if (root === 'signer') return data.app.helperMode === 'self' ? null : '대리 신청인';
    return '그 밖에';
  };
  for (const k of keys) {
    const title = titleOf(k);
    if (!title) continue;
    if (!groups.has(title)) groups.set(title, { title, keys: [] });
    groups.get(title)!.keys.push(k);
  }
  return [...groups.values()];
}

const labelOf = (k: string) => {
  if (k === 'signer.name') return '대리 신청인 이름';
  return LOCAL_LABEL[k.split('.').pop() ?? k] ?? k;
};

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
  const [local, setLocal] = useState<LocalValues>({});

  useEffect(() => {
    if (typeof session !== 'object') return;
    let alive = true;
    apiFetch<PrintData>(`/api/apps/${encodeURIComponent(appId)}/print`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLocal((v) => ({ ...(d.localPrefill ?? {}), ...v }));
      })
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

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setLocal((v) => ({ ...v, [k]: k.endsWith('rrn') ? formatRrn(e.target.value) : e.target.value }));
  const groups = data ? localGroups(data) : [];

  const pages = data && (
    <>
      <FormPage data={data} local={local} />
      <ReadyCardPage data={data} script={script} />
    </>
  );

  return (
    <AppShell
      step={4}
      back={{ href: base + '/ready' }}
      todo="출력하거나 PDF로 저장해 주세요"
      speakText="출력하거나 PDF로 저장해 주세요"
      resumeCode={typeof session === 'object' ? session.resumeCode : null}
    >
      <style>{PRINT_CSS}</style>
      <div className="grid gap-4 pb-4">
        <h1>신청서 출력</h1>
        <p className="notice notice-good font-bold leading-relaxed">✅ {ACCEPT_NOTICE}</p>

        <div className="panel grid gap-3">
          <h2 className="text-[1.1rem] font-bold">신청서에 들어갈 개인 정보</h2>
          <p className="text-[0.9rem] leading-relaxed">
            여기 적은 값은 저장하지 않아요. 신청서에 찍혀서 출력만 돼요. 새로고침하면 지워져요. 모르는 칸은 비워 두고 주민센터에서 적어도 돼요.
          </p>
          {groups.map((g) => (
            <fieldset key={g.title} className="grid gap-2 rounded-xl border border-hair bg-[#f8faff] p-3">
              <legend className="px-1 font-bold">{g.title}</legend>
              {g.keys.map((k) => (
                <label key={k} className="grid gap-1 font-bold">
                  {labelOf(k)}
                  <input
                    className={input}
                    value={local[k] ?? ''}
                    onChange={set(k)}
                    autoComplete="off"
                    inputMode={k.endsWith('rrn') || k.startsWith('visit.') || k.endsWith('number') ? 'numeric' : k.endsWith('phone') || k.endsWith('mobile') ? 'tel' : undefined}
                    placeholder={k.endsWith('rrn') ? '000000-0000000' : undefined}
                  />
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        <BigButton onClick={() => window.print()} disabled={!data}>
          🖨 출력하기
        </BigButton>
        <p className="text-[0.9rem]">PDF로 저장하려면 출력하기를 누른 뒤 프린터를 PDF로 저장으로 바꾸세요.</p>

        {error && <p role="alert" className="font-bold text-warn">{error}</p>}
        {!data && !error && <Loading text="신청서와 준비 카드를 만들고 있어요" />}
        {data && (
          <div className="grid gap-4">
            <h2 className="text-[1.1rem] font-bold">미리 보기 (공식 신청서, 마지막 장 준비 카드)</h2>
            <div className="overflow-hidden rounded-xl border border-hair shadow-[0_14px_36px_rgba(31,54,106,0.08)]">{pages}</div>
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
