'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReadyData } from '@/app/api/apps/[id]/ready/route';
import {
  computeRemaining,
  isCheckItem,
  isPrecheckItem,
  READY_DONE_TEXT,
  remainingSpeakText,
} from '@/app/api/apps/[id]/ready/remaining';
import CardTabs, { initialTab, type CardTab } from '@/components/card/CardTabs';
import DocList, { docsSpeakText } from '@/components/card/DocList';
import PlaceGroups, { placesSpeakText } from '@/components/card/PlaceGroups';
import ScriptBox from '@/components/card/ScriptBox';
import { btn } from '@/components/card/styles';
import { NO_SESSION_TEXT, RETRY_TEXT, useCardSession } from '@/components/card/useCardSession';
import { useScript } from '@/components/card/useScript';
import { ShareButton } from '@/components/share/ShareButton';
import { StageTracker } from '@/components/status/StageTracker';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { speak } from '@/lib/client/tts';
import { ddayFrom } from '@/lib/format';
import { isDocsReady, officeName } from '@/lib/rules/checklist';
import type { ChecklistItem, PrecheckResult } from '@/lib/types';
import RemainingChecks from './RemainingChecks';

const TODO = '남은 것을 0개로 만들어 주세요';

export default function ReadyScreen({ appId }: { appId: string }) {
  const session = useCardSession(appId);
  const base = '/a/' + encodeURIComponent(appId);
  const [data, setData] = useState<ReadyData | null>(null);
  const [tab, setTab] = useState<CardTab | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof session !== 'object') return;
    let alive = true;
    apiFetch<ReadyData>(`/api/apps/${encodeURIComponent(appId)}/ready`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setTab((t) => t ?? initialTab(d.remaining.count));
      })
      .catch((e) => alive && setLoadError(e instanceof ApiError ? e.message : RETRY_TEXT));
    return () => { alive = false; };
  }, [appId, session]);

  const { script, loading: scriptLoading } = useScript(appId, data, tab === 'script');

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

  const resumeCode = typeof session === 'object' ? session.resumeCode : null;
  if (!data || !tab) {
    return (
      <AppShell back={{ href: base + '/fill' }} todo={TODO} resumeCode={resumeCode} step={3}>
        {loadError ? (
          <div className="grid gap-3">
            <p role="alert" className="font-bold text-warn">{loadError}</p>
            <BigButton onClick={() => location.reload()}>다시 열기</BigButton>
          </div>
        ) : (
          <Loading text="남은 것을 세고 있어요" />
        )}
      </AppShell>
    );
  }

  // 체크하면 바로 줄도록 화면 상태로 다시 센다
  const remaining = computeRemaining(data);
  const checks = remaining.items.filter(isCheckItem);
  const prechecks = remaining.items.filter(isPrecheckItem);
  const sup = data.activeSupplement;
  const supNames = sup ? data.checklist.filter((i) => i.supplementId === sup.id).map((i) => i.docName) : [];

  // 안 챙긴 것 → 기한 가까운 것 → 서버가 정한 기본 순서
  const resort = (list: ChecklistItem[]) =>
    [...list].sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      const da = a.dueDate ?? '9999-12-31';
      const db = b.dueDate ?? '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return (data.rank[a.id] ?? 1e9) - (data.rank[b.id] ?? 1e9);
    });

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
    const list = resort(data.checklist.map((i) => (i.id === item.id ? { ...i, isDone: next } : i)));
    setData({ ...data, checklist: list, docsReady: isDocsReady(list) });
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

  const answerPrecheck = async (ruleId: string, result: PrecheckResult) => {
    const before = data;
    setData({ ...data, precheckPending: data.precheckPending.map((p) => (p.id === ruleId ? { ...p, result } : p)) });
    setBusyId(ruleId);
    setError(null);
    try {
      await apiFetch(`/api/apps/${encodeURIComponent(appId)}/precheck`, { method: 'PUT', body: { ruleId, result } });
    } catch {
      setData(before);
      setError(RETRY_TEXT);
    } finally {
      setBusyId(null);
    }
  };

  const done = remaining.count === 0;

  return (
    <AppShell back={{ href: base + '/fill' }} todo={TODO} speakText={remainingSpeakText(remaining)} resumeCode={resumeCode} step={3}>
      <div className="grid gap-4 pb-4">
        <StageTracker
          compact
          status={data.app.status}
          docsReady={done}
          submittedAt={data.app.submittedAt}
          supplementDday={sup?.deadline ? ddayFrom(sup.deadline) : null}
        />

        {done ? (
          <div
            role="status"
            className="panel flex flex-col items-center gap-2 border-ok bg-ok-soft p-5 text-center"
          >
            <Boknyang mood="happy" size="lg" />
            <p className="text-[1.5rem] font-bold leading-snug text-ok">{READY_DONE_TEXT}</p>
          </div>
        ) : (
          <div role="status" className="panel p-5 text-center">
            <h1 className="text-[1.4rem] font-bold leading-snug">
              주민센터에 한 번에 내기까지
              <span className="mt-1 block text-[2.4rem] leading-tight text-primary-dark">남은 것 {remaining.count}개</span>
            </h1>
            <p className="mt-2 text-[0.95rem] text-muted">
              {[
                remaining.docs && `📋 챙길 서류 ${remaining.docs}개`,
                remaining.checks && `⚠ 확인할 것 ${remaining.checks}개`,
                remaining.prechecks && `💡 자주 빠지는 것 ${remaining.prechecks}개`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        )}

        <p className="text-[0.9rem] text-muted">📍 {officeName(data.place)}에 낼 것</p>

        {sup && (
          <Link
            href={`${base}/extra/${encodeURIComponent(sup.id)}`}
            className="notice notice-warn block font-bold"
          >
            📮 추가로 챙길 서류가 있어요.
          </Link>
        )}

        <CardTabs selected={tab} remaining={remaining.count} onSelect={selectTab} />

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
              <RemainingChecks
                appId={appId}
                checks={checks}
                prechecks={prechecks}
                busyId={busyId}
                onPrecheck={answerPrecheck}
                onSpeak={speak}
              />
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
          <Link href={base + '/print'} className={done ? btn.primary : btn.secondary}>
            🖨 출력하러 가기
          </Link>
          <ShareButton appId={appId} />
        </div>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
