'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CardData } from '@/app/api/apps/[id]/card/load';
import { ShareButton } from '@/components/share/ShareButton';
import { StageTracker } from '@/components/status/StageTracker';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { speak } from '@/lib/client/tts';
import { ddayFrom, ddayLabel, formatDateKo } from '@/lib/format';
import { countRemaining, isDocsReady, officeName } from '@/lib/rules/checklist';
import type { ChecklistItem } from '@/lib/types';
import CardTabs, { initialTab, type CardTab } from './CardTabs';
import CheckTasks from './CheckTasks';
import DocList, { docsSpeakText } from './DocList';
import PlaceGroups, { placesSpeakText } from './PlaceGroups';
import ScriptBox from './ScriptBox';
import { btn } from './styles';
import { NO_SESSION_TEXT, RETRY_TEXT, useCardSession } from './useCardSession';
import { useScript } from './useScript';

function todoText(d: CardData, remaining: number): string {
  if (d.activeSupplement) {
    return d.activeSupplement.deadline
      ? `추가로 챙길 서류를 ${formatDateKo(d.activeSupplement.deadline).replace(/ \(.\)$/, '')}까지 내야 해요`
      : '추가로 챙길 서류를 내야 해요';
  }
  if (remaining > 0) return `챙길 서류 ${remaining}개를 준비해 주세요`;
  return '서류를 다 챙겼어요. 주민센터에 내러 가요';
}

export default function CardScreen({ appId }: { appId: string }) {
  const session = useCardSession(appId);
  const base = '/a/' + encodeURIComponent(appId);
  const [data, setData] = useState<CardData | null>(null);
  const [tab, setTab] = useState<CardTab | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 체크한 뒤 다시 정렬: 안 챙긴 것 → 기한 가까운 것 → 서버가 정한 기본 순서
  const resort = (list: ChecklistItem[]) =>
    [...list].sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      const da = a.dueDate ?? '9999-12-31';
      const db = b.dueDate ?? '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return (data?.rank[a.id] ?? 1e9) - (data?.rank[b.id] ?? 1e9);
    });

  useEffect(() => {
    if (typeof session !== 'object') return;
    let alive = true;
    apiFetch<CardData>(`/api/apps/${encodeURIComponent(appId)}/card`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setTab((t) => t ?? initialTab(countRemaining(d.checklist)));
      })
      .catch((e) => alive && setLoadError(e instanceof ApiError ? e.message : RETRY_TEXT));
    return () => { alive = false; };
  }, [appId, session]);

  const { script, loading: scriptLoading } = useScript(appId, data, tab === 'script');

  if (session === 'missing') {
    return (
      <AppShell back={{ href: base }} todo="이어서 하기 번호를 넣어 주세요">
        <div className="grid gap-3">
          <p>{NO_SESSION_TEXT}</p>
          <BigButton href="/resume">번호로 이어서 하기</BigButton>
        </div>
      </AppShell>
    );
  }

  const resumeCode = typeof session === 'object' ? session.resumeCode : null;
  if (!data || !tab) {
    return (
      <AppShell back={{ href: base }} todo="제출 준비 카드를 열고 있어요" resumeCode={resumeCode}>
        {loadError ? (
          <div className="grid gap-3">
            <p role="alert" className="font-bold text-warn">{loadError}</p>
            <BigButton onClick={() => location.reload()}>다시 열기</BigButton>
          </div>
        ) : (
          <Loading text="제출 준비 카드를 만들고 있어요" />
        )}
      </AppShell>
    );
  }

  const remaining = countRemaining(data.checklist);
  const sup = data.activeSupplement;
  const supDday = sup?.deadline ? ddayFrom(sup.deadline) : null;
  const supNames = sup ? data.checklist.filter((i) => i.supplementId === sup.id).map((i) => i.docName) : [];

  const tabSpeak = (t: CardTab): string =>
    t === 'docs' ? docsSpeakText(data.checklist) : t === 'places' ? placesSpeakText(data.checklist) : script ?? '';

  const selectTab = (t: CardTab) => {
    setTab(t);
    const text = tabSpeak(t);
    if (text) speak(text);
  };

  const toggle = async (item: ChecklistItem) => {
    const before = data;
    const next = !item.isDone;
    const optimistic = resort(data.checklist.map((i) => (i.id === item.id ? { ...i, isDone: next } : i)));
    setData({ ...data, checklist: optimistic, docsReady: isDocsReady(optimistic) });
    setBusyId(item.id);
    setError(null);
    try {
      await apiFetch(`/api/apps/${encodeURIComponent(appId)}/checklist/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        body: { isDone: next },
      });
    } catch {
      setData(before);
      setError(RETRY_TEXT);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell back={{ href: base }} todo={todoText(data, remaining)} speakText={tabSpeak(tab) || null} resumeCode={resumeCode}>
      <div className="grid gap-4 pb-4">
        <StageTracker
          compact
          status={data.app.status}
          docsReady={data.docsReady}
          submittedAt={data.app.submittedAt}
          supplementDday={supDday}
        />

        <div>
          <h1>제출 준비 카드</h1>
          <p className="text-[0.9rem]">{officeName(data.place)}에 낼 것</p>
        </div>

        {sup && (
          <Link
            href={`${base}/extra/${encodeURIComponent(sup.id)}`}
            className="block rounded-2xl border-[3px] border-warn bg-white p-4 font-bold text-warn"
          >
            📮 추가로 챙길 서류가 있어요.
            {sup.deadline && supDday !== null && (
              <span className="block text-ink">
                {formatDateKo(sup.deadline)}까지, {ddayLabel(supDday).text}
              </span>
            )}
          </Link>
        )}

        <CardTabs selected={tab} remaining={remaining} onSelect={selectTab} />

        {error && (
          <p role="alert" className="rounded-xl border-[3px] border-warn bg-white p-3 font-bold text-warn">
            {error}
          </p>
        )}

        <div role="tabpanel">
          {tab === 'docs' && (
            <DocList
              items={data.checklist}
              onToggle={toggle}
              onSpeak={speak}
              busyId={busyId}
              happyMascot={<Boknyang mood="happy" size="md" />}
            >
              <CheckTasks appId={appId} tasks={data.checkTasks} precheckPending={data.precheckPending} onSpeak={speak} />
            </DocList>
          )}
          {tab === 'places' && <PlaceGroups items={data.checklist} place={data.place} />}
          {tab === 'script' && (
            <ScriptBox
              script={script}
              loading={scriptLoading}
              onSpeak={speak}
              supplementNames={supNames}
              checkLabels={data.checkTasks.map((t) => t.label)}
              place={data.place}
            />
          )}
        </div>

        <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-bg py-2">
          <Link href={base + '/print'} className={btn.secondary}>
            🖨 옮겨 쓰는 카드 출력
          </Link>
          <ShareButton appId={appId} />
        </div>

        <BigButton href={base + '/visit'} icon="🏢">
          주민센터에 다녀왔어요
        </BigButton>
        <p className="text-[0.9rem]">주민센터에서 서류를 더 달라고 할 수도 있어요.</p>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
