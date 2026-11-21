'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ProgramTemplates, TemplateListItem } from '@/app/api/programs/[code]/templates/route';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { saveSession } from '@/lib/client/session';
import { formatCode } from '@/lib/format';
import type { HelperMode, Session } from '@/lib/types';

type FillMode = 'question' | 'form';

const TODO = '어떤 신청서를 쓰는지 확인해 주세요';
const PREPARING = '준비 중이에요, 내용은 준비 카드에 정리돼요';

/** 주민센터에 내는 서식 (14-1). 그림과 칸이 들어온 것만 미리 보기를 보여 준다 */
const FORMS: { code: string; name: string; sub: string }[] = [
  { code: 'social_security_application', name: '사회보장급여 신청(변경)서', sub: '공통 신청서' },
  { code: 'income_asset_report', name: '소득 재산 신고서', sub: '버는 돈과 재산' },
  { code: 'financial_info_consent', name: '금융정보 등 제공 동의서', sub: '통장 확인 동의' },
];

const HELPERS: { mode: HelperMode; icon: string; label: string; sub: string }[] = [
  { mode: 'self', icon: '🙋', label: '신청하는 본인이에요', sub: '내 신청서를 써요' },
  { mode: 'family', icon: '👨‍👩‍👧', label: '가족이 도와줘요', sub: '부모님 옆에서 같이 해요' },
  { mode: 'helper', icon: '🤝', label: '주민센터나 배움터 도우미예요', sub: '도우미, 강사, 공무원' },
];

const METHODS: { mode: FillMode; icon: string; label: string; sub: string }[] = [
  { mode: 'question', icon: '💬', label: '질문에 답하며 채우기 (추천)', sub: '말이나 버튼으로 하나씩 대답해요' },
  { mode: 'form', icon: '⌨️', label: '양식에 직접 적기', sub: '가족, 도우미가 양식 칸을 눌러 적어요' },
];

function mergeForms(templates: TemplateListItem[]) {
  const byCode = new Map(templates.map((t) => [t.code, t]));
  const known = FORMS.map((f) => {
    const t = byCode.get(f.code);
    return { ...f, name: t?.name ?? f.name, pageImages: t?.pageImages ?? [], slotCount: t?.slotCount ?? 0 };
  });
  const extra = templates
    .filter((t) => !FORMS.some((f) => f.code === t.code))
    .map((t) => ({ code: t.code, name: t.name, sub: '', pageImages: t.pageImages, slotCount: t.slotCount }));
  return [...known, ...extra].map((f) => ({ ...f, ready: f.pageImages.length > 0 && f.slotCount > 0 }));
}

export default function ProgramStart({ programCode }: { programCode: string }) {
  const router = useRouter();
  const starting = useRef(false);
  const [info, setInfo] = useState<ProgramTemplates | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [helperMode, setHelperMode] = useState<HelperMode | null>(null);
  const [method, setMethod] = useState<FillMode>('question');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<ProgramTemplates>(`/api/programs/${encodeURIComponent(programCode)}/templates`)
      .then((d) => alive && setInfo(d))
      .catch((e) => alive && setLoadError(e instanceof ApiError ? e.message : '신청서를 불러오지 못했어요.'));
    return () => { alive = false; };
  }, [programCode]);

  async function start() {
    if (starting.current || !helperMode) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      const created = await apiFetch<Session>('/api/apps', { method: 'POST', body: { programCode, helperMode } });
      saveSession(created);
      setSession(created);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '신청을 시작하지 못했어요. 다시 시도해 주세요.');
      starting.current = false;
      setBusy(false);
    }
  }

  // 신청 건을 만든 뒤: 이어서 하기 번호 안내
  if (session) {
    const fillHref = `/a/${encodeURIComponent(session.appId)}/fill?mode=${method}`;
    return (
      <AppShell
        back={null}
        todo="이어서 하기 번호를 적고 시작해 주세요"
        speakText={`이어서 하기 번호예요. ${[...session.resumeCode].join(' ')}. 종이에 적어 두세요.`}
        resumeCode={session.resumeCode}
        step={1}
      >
        <div className="grid gap-4 text-center">
          <h1>이어서 하기 번호예요</h1>
          <p className="panel py-5 font-mono text-5xl font-black tracking-widest text-primary">
            {formatCode(session.resumeCode)}
          </p>
          <p className="leading-relaxed">언제 그만둬도 이 번호로 이어서 할 수 있어요. 종이에 적어 두세요.</p>
          <BigButton onClick={() => router.push(fillHref)}>적었어요, 시작할게요</BigButton>
        </div>
      </AppShell>
    );
  }

  if (loadError || (info && info.program.status !== 'available')) {
    return (
      <AppShell back={{ href: '/' }} todo="다른 복지를 골라 주세요">
        <div className="grid gap-3">
          <p role="alert" className="font-bold text-warn">
            {loadError ?? `${info?.program.name} 신청 준비는 아직 준비 중이에요.`}
          </p>
          <BigButton href="/">복지 고르기로 돌아가기</BigButton>
        </div>
      </AppShell>
    );
  }

  if (!info) {
    return (
      <AppShell back={{ href: '/' }} todo={TODO} step={1}>
        <Loading text="신청서 양식을 불러오고 있어요" />
      </AppShell>
    );
  }

  const forms = mergeForms(info.templates);
  const slotTotal = forms.reduce((n, f) => n + (f.ready ? f.slotCount : 0), 0);

  return (
    <AppShell
      back={{ href: '/' }}
      todo={TODO}
      step={1}
      speakText={`${info.program.name} 신청서를 불러왔어요. 누가 쓰고 있는지, 어떻게 채울지 골라 주세요.`}
    >
      <div className="grid gap-5 pb-4">
        <div>
          <h1>작성할 양식을 확인해요</h1>
          <p className="mt-1 text-muted">{info.program.name} 신청서 양식을 불러왔어요.</p>
        </div>

        <section className="panel grid gap-3" aria-labelledby="forms-title">
          <h2 id="forms-title">📄 불러온 서식 {forms.length}개</h2>
          <ul className="grid gap-3">
            {forms.map((f) => (
              <li key={f.code} className="rounded-2xl border border-hair bg-[#f8faff] p-4">
                <p className="text-[1.05rem] font-bold leading-snug">📄 {f.name}</p>
                {f.sub && <p className="text-[max(18px,0.85rem)] text-muted">{f.sub}</p>}
                {f.ready ? (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {f.pageImages.map((src, i) => (
                        <figure key={src} className="grid gap-1 text-center">
                          <Image
                            src={src}
                            alt={`${f.name} ${i + 1}쪽 미리 보기`}
                            width={1240}
                            height={1753}
                            sizes="(max-width: 480px) 30vw, 140px"
                            className="h-auto w-full rounded border border-line bg-white"
                          />
                          <figcaption className="text-[max(18px,0.8rem)]">{i + 1}쪽</figcaption>
                        </figure>
                      ))}
                    </div>
                    <p className="mt-2 text-[max(18px,0.9rem)]"><span className="marker marker-good mr-1">불러옴</span>칸 {f.slotCount}개를 답에 맞춰 미리 채워 드려요.</p>
                  </>
                ) : (
                  <p className="notice mt-2 text-[max(18px,0.9rem)] leading-relaxed"><span className="marker marker-neutral mr-1">준비 중</span>{PREPARING}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="leading-relaxed">
            {slotTotal > 0 ? `적을 칸 ${slotTotal}개, ` : ''}함께 낼 서류는 답에 따라 정해져요.
          </p>
        </section>

        <section className="panel grid gap-3" aria-labelledby="helper-title">
          <h2 id="helper-title">누가 쓰고 있나요?</h2>
          {HELPERS.map((h) => (
            <BigButton
              key={h.mode}
              variant="choice"
              icon={h.icon}
              sub={h.sub}
              selected={helperMode === h.mode}
              onClick={() => setHelperMode(h.mode)}
            >
              {h.label}
            </BigButton>
          ))}
          {helperMode && helperMode !== 'self' && (
            <p className="notice leading-relaxed">
              🗣 질문이 &quot;신청하시는 분은...&quot;으로 나와요. 신청하시는 분께 읽어 드리고 같이 대답해 주세요.
            </p>
          )}
        </section>

        <section className="panel grid gap-3" aria-labelledby="method-title">
          <h2 id="method-title">채우는 방법 고르기</h2>
          {METHODS.map((m) => (
            <BigButton
              key={m.mode}
              variant="choice"
              icon={m.icon}
              sub={m.sub}
              selected={method === m.mode}
              onClick={() => setMethod(m.mode)}
            >
              {m.label}
            </BigButton>
          ))}
          <p className="text-[max(18px,0.9rem)] text-muted">두 방법 모두 같은 답으로 저장돼요. 채우는 중에 바꿀 수 있어요.</p>
        </section>

        <p>🔒 이름과 주민등록번호는 저장하지 않아요. 출력할 때만 적어요.</p>
        <BigButton onClick={start} disabled={busy || !helperMode}>
          {busy ? '신청을 시작하고 있어요' : helperMode ? '시작할게요' : '누가 쓰고 있는지 먼저 골라 주세요'}
        </BigButton>
        {error && <p className="font-bold text-warn" role="alert">{error}</p>}
        <Disclaimer />
      </div>
    </AppShell>
  );
}
