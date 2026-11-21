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

/** 따로 입력받지 않는 칸: 휴대전화는 전화번호와 같게, 월과 일은 날짜 고르기 하나로 */
const HIDDEN_KEYS = new Set(['applicant.mobile', 'visit.month', 'visit.day']);
const SAME_AS_APPLICANT = 'account.owner_name';

/** 입력한 값에서 양식에 찍을 값을 만든다 (전화번호 두 칸, 예금주, 신청 날짜) */
function effectiveLocal(local: LocalValues, ownerSame: boolean, visitDate: string): LocalValues {
  const out: LocalValues = { ...local };
  out['applicant.mobile'] = local['applicant.phone'];
  if (ownerSame) out[SAME_AS_APPLICANT] = local['applicant.name'];
  const [y, m, d] = visitDate ? visitDate.split('-') : [];
  out['visit.year'] = y ?? '';
  out['visit.month'] = m ? String(Number(m)) : '';
  out['visit.day'] = d ? String(Number(d)) : '';
  return out;
}

/** 오늘 날짜 (서울) YYYY-MM-DD */
function todaySeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function dateKo(v: string): string {
  const [y, m, d] = v.split('-').map(Number);
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${w})`;
}

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
    if (HIDDEN_KEYS.has(k)) continue;
    const title = titleOf(k);
    if (!title) continue;
    if (!groups.has(title)) groups.set(title, { title, keys: [] });
    groups.get(title)!.keys.push(k);
  }
  return [...groups.values()];
}

const labelOf = (k: string) => {
  if (k === 'signer.name') return '대리 신청인 이름';
  if (k === 'applicant.phone') return '전화번호 (휴대전화)';
  if (k === 'visit.year') return '주민센터에 가는 날';
  return LOCAL_LABEL[k.split('.').pop() ?? k] ?? k;
};

/** 주민등록번호: 숫자만 받아서 앞 6자리 뒤에 - */
function formatRrn(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 13);
  return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
}

/**
 * 전화번호: 숫자만 받아서 치는 대로 하이픈을 넣는다.
 * 02-123-4567, 02-1234-5678 / 010-1234-5678, 031-123-4567 / 1588-1234
 */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (/^1[5-9]/.test(d)) return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4, 8)}` : d;
  const area = d.startsWith('02') ? 2 : 3;
  if (d.length <= area) return d;
  const rest = d.slice(area);
  // 가운데 자리: 휴대폰(01X)은 늘 4자리 (치는 중에 하이픈이 안 움직이게), 지역번호는 남은 숫자가 8개면 4자리
  const mid = d.startsWith('01') || rest.length >= 8 ? 4 : 3;
  if (rest.length <= mid) return `${d.slice(0, area)}-${rest}`;
  return `${d.slice(0, area)}-${rest.slice(0, mid)}-${rest.slice(mid, mid + 4)}`;
}

export default function PrintScreen({ appId }: { appId: string }) {
  const session = useCardSession(appId);
  const base = '/a/' + encodeURIComponent(appId);
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 이름, 주민등록번호, 전화번호는 이 화면 상태에만 둔다. 서버로 보내지도, 저장하지도 않는다.
  const [local, setLocal] = useState<LocalValues>({});
  const [ownerSame, setOwnerSame] = useState(false);
  const [visitDate, setVisitDate] = useState('');

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
    setLocal((v) => ({
      ...v,
      [k]: k.endsWith('rrn') ? formatRrn(e.target.value) : /(phone|mobile)$/.test(k) ? formatPhone(e.target.value) : e.target.value,
    }));
  const groups = data ? localGroups(data) : [];
  const shown = effectiveLocal(local, ownerSame, visitDate);

  const pages = data && (
    <>
      <FormPage data={data} local={shown} />
      <ReadyCardPage data={data} script={script} />
    </>
  );

  return (
    <AppShell
      step={4}
      wide
      back={{ href: base + '/ready' }}
      todo="출력하거나 PDF로 저장해 주세요"
      resumeCode={typeof session === 'object' ? session.resumeCode : null}
    >
      <style>{PRINT_CSS}</style>
      <div className="grid gap-4 pb-4 pc:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] pc:grid-rows-[auto_auto_1fr] pc:items-start pc:gap-6">
        {/* PC: 위 제목 / 왼쪽 입력과 출력 버튼 / 오른쪽 미리 보기. 모바일은 이 순서 그대로 한 줄 */}
        <div className="grid gap-4 pc:col-span-2">
        <h1>신청서 출력</h1>
        <p className="notice notice-good font-bold leading-relaxed">✅ {ACCEPT_NOTICE}</p>

        </div>

        <div className="grid gap-4 pc:col-start-1 pc:row-start-2">
        <div className="panel grid gap-3">
          <h2 className="text-[1.1rem] font-bold">신청서에 들어갈 개인 정보</h2>
          <p className="text-[0.9rem] leading-relaxed">
            여기 적은 값은 저장하지 않아요. 신청서에 찍혀서 출력만 돼요. 새로고침하면 지워져요. 모르는 칸은 비워 두고 주민센터에서 적어도 돼요.
          </p>
          {groups.map((g) => (
            <fieldset key={g.title} className="grid gap-2 rounded-xl border border-hair bg-[#f8faff] p-3">
              <legend className="px-1 font-bold">{g.title}</legend>
              {g.keys.map((k) => {
                if (k === 'visit.year') {
                  return (
                    <div key={k} className="grid gap-2">
                      <label className="grid gap-1 font-bold">
                        {labelOf(k)}
                        <input
                          type="date"
                          className={input}
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="min-h-12 rounded-xl border-2 border-primary-dark bg-white px-3 font-bold" onClick={() => setVisitDate(todaySeoul())}>
                          오늘
                        </button>
                        {visitDate && (
                          <button type="button" className="min-h-12 rounded-xl px-3 font-bold text-primary-dark underline underline-offset-4" onClick={() => setVisitDate('')}>
                            지우기
                          </button>
                        )}
                        <span className="font-bold">{visitDate ? dateKo(visitDate) : '날짜 칸을 누르면 달력이 나와요'}</span>
                      </div>
                    </div>
                  );
                }
                if (k === SAME_AS_APPLICANT) {
                  return (
                    <div key={k} className="grid gap-2">
                      <label className="grid gap-1 font-bold">
                        {labelOf(k)}
                        <input
                          className={input}
                          value={(ownerSame ? local['applicant.name'] : local[k]) ?? ''}
                          onChange={set(k)}
                          disabled={ownerSame}
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="button"
                        aria-pressed={ownerSame}
                        onClick={() => setOwnerSame((v) => !v)}
                        className={
                          'min-h-12 rounded-xl border-2 px-3 font-bold ' +
                          (ownerSame ? 'border-primary bg-primary-soft text-primary-dark' : 'border-primary-dark bg-white text-ink')
                        }
                      >
                        {ownerSame ? '✓ 신청자와 같음' : '신청자와 같음'}
                      </button>
                    </div>
                  );
                }
                return (
                  <label key={k} className="grid gap-1 font-bold">
                    {labelOf(k)}
                    <input
                      className={input}
                      value={local[k] ?? ''}
                      onChange={set(k)}
                      autoComplete="off"
                      inputMode={k.endsWith('rrn') || k.endsWith('number') ? 'numeric' : k.endsWith('phone') ? 'tel' : undefined}
                      placeholder={k.endsWith('rrn') ? '000000-0000000' : undefined}
                    />
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>

        <BigButton onClick={() => window.print()} disabled={!data}>
          🖨 출력하기
        </BigButton>
        <p className="text-[0.9rem]">PDF로 저장하려면 출력하기를 누른 뒤 프린터를 PDF로 저장으로 바꾸세요.</p>

        {error && <p role="alert" className="font-bold text-warn">{error}</p>}
        </div>

        <div className="grid gap-4 pc:sticky pc:top-4 pc:col-start-2 pc:row-span-2 pc:row-start-2 pc:max-h-[calc(100dvh-2rem)] pc:overflow-auto">
        {!data && !error && <Loading text="신청서와 준비 카드를 만들고 있어요" />}
        {data && (
          <div className="grid gap-4">
            <h2 className="text-[1.1rem] font-bold">미리 보기 (공식 신청서, 마지막 장 준비 카드)</h2>
            <div className="overflow-hidden rounded-xl border border-hair shadow-[0_14px_36px_rgba(31,54,106,0.08)]">{pages}</div>
          </div>
        )}

        </div>

        <div className="grid gap-4 pc:col-start-1 pc:row-start-3">
        <BigButton href={base + '/visit'} icon="🏢" variant="secondary">
          주민센터에 다녀왔어요
        </BigButton>
        <Disclaimer />
        </div>
      </div>
      {data && typeof document !== 'undefined' && createPortal(<div className="print-root">{pages}</div>, document.body)}
    </AppShell>
  );
}
