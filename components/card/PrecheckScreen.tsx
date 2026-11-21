'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { speak } from '@/lib/client/tts';
import { firstUndoneIndex, needsFix, precheckSpeakText, type PrecheckResults } from '@/lib/rules/precheck';
import type { PrecheckResult, PrecheckRule } from '@/lib/types';
import PrecheckStep from './PrecheckStep';
import { NO_SESSION_TEXT, RETRY_TEXT, useCardSession } from './useCardSession';

const TODO = '주민센터에서 자주 다시 달라고 하는 것을 미리 확인해요';

/** 어디서 시작할지: 아직 안 한 첫 점검 → 없으면 no/unknown인 첫 점검 → 없으면 -1 */
function startIndex(rules: PrecheckRule[], results: PrecheckResults): number {
  const undone = firstUndoneIndex(rules, results);
  if (undone >= 0) return undone;
  return rules.findIndex((r) => results[r.id] !== 'yes');
}

export default function PrecheckScreen({ appId }: { appId: string }) {
  const router = useRouter();
  const session = useCardSession(appId);
  const base = '/a/' + encodeURIComponent(appId);
  const [rules, setRules] = useState<PrecheckRule[] | null>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<PrecheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof session !== 'object') return;
    let alive = true;
    apiFetch<{ rules: PrecheckRule[]; results: PrecheckResults }>(`/api/apps/${encodeURIComponent(appId)}/precheck`)
      .then((d) => {
        if (!alive) return;
        const start = startIndex(d.rules, d.results);
        if (d.rules.length === 0 || start < 0) {
          router.replace(base + '/card');
          return;
        }
        setRules(d.rules);
        setIndex(start);
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : RETRY_TEXT));
    return () => { alive = false; };
  }, [appId, base, router, session]);

  if (session === 'missing') {
    return (
      <AppShell back={{ href: base + '/review' }} todo="이어서 하기 번호를 넣어 주세요">
        <div className="grid gap-3">
          <p>{NO_SESSION_TEXT}</p>
          <BigButton href="/resume">번호로 이어서 하기</BigButton>
        </div>
      </AppShell>
    );
  }

  const rule = rules?.[index];
  const resumeCode = typeof session === 'object' ? session.resumeCode : null;

  const goNext = () => {
    setShown(null);
    if (!rules || index + 1 >= rules.length) router.push(base + '/card');
    else setIndex(index + 1);
  };
  const goBack = () => {
    setShown(null);
    if (index === 0) router.push(base + '/review');
    else setIndex(index - 1);
  };
  const answer = async (result: PrecheckResult) => {
    if (!rule) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/apps/${encodeURIComponent(appId)}/precheck`, {
        method: 'PUT',
        body: { ruleId: rule.id, result },
      });
      if (needsFix(result)) {
        setShown(result);
        speak(rule.fixEasy);
      } else goNext();
    } catch {
      setError(RETRY_TEXT);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      back={{ onClick: goBack }}
      todo={TODO}
      speakText={rule ? (shown ? rule.fixEasy : precheckSpeakText(rule)) : null}
      resumeCode={resumeCode}
    >
      <div className="grid gap-4">
        <h1>내기 전에 한 번 더 확인해요</h1>
        {error && (
          <p role="alert" className="rounded-xl border-[3px] border-warn bg-white p-3 font-bold text-warn">
            {error}
          </p>
        )}
        {!rule && !error && <Loading text="점검할 것을 준비하고 있어요" />}
        {rule && rules && (
          <PrecheckStep
            key={rule.id}
            rule={rule}
            index={index}
            total={rules.length}
            result={shown}
            busy={busy}
            onAnswer={answer}
            onNext={goNext}
            onLater={() => router.push(base + '/card')}
            onSpeak={speak}
            mascot={<Boknyang size="sm" />}
          />
        )}
      </div>
    </AppShell>
  );
}
