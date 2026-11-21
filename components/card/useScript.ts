'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';
import { apiFetch } from '@/lib/client/api';
import type { CardScriptRequest } from '@/lib/types';
import { fallbackScript } from './ScriptBox';

interface ScriptSource {
  scriptInput: CardScriptRequest;
  checkTasks: unknown[];
  householdSize: number | null;
}

interface Cached { input: string; script: string }

function readCache(appId: string, input: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.script(appId));
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    return c.input === input && typeof c.script === 'string' ? c.script : null;
  } catch {
    return null;
  }
}

function writeCache(appId: string, input: string, script: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.script(appId), JSON.stringify({ input, script } satisfies Cached));
  } catch {
    /* 저장이 안 돼도 화면은 그대로 */
  }
}

export function templateScript(d: ScriptSource): string {
  return fallbackScript({
    programName: d.scriptInput.programName,
    applicantType: d.scriptInput.applicantType,
    householdSize: d.householdSize,
    hasCheckTasks: d.checkTasks.length > 0,
  });
}

/**
 * 주민센터에서 할 말. 03의 POST /api/card-script로 받고,
 * 답이 안 바뀌었으면(재료가 같으면) 저장해 둔 것을 쓴다. 실패하면 틀 문장.
 */
export function useScript(appId: string, data: ScriptSource | null, enabled: boolean) {
  const [result, setResult] = useState<{ input: string; script: string } | null>(null);
  const input = data ? JSON.stringify(data.scriptInput) : '';

  // data는 브라우저에서 불러온 뒤에만 생기므로 여기서 localStorage를 읽어도 된다
  const cached = enabled && data ? readCache(appId, input) : null;

  useEffect(() => {
    if (!enabled || !data || cached || result?.input === input) return;
    let alive = true;
    apiFetch<{ script: string }>('/api/card-script', { method: 'POST', body: data.scriptInput })
      .then((r) => {
        const script = typeof r?.script === 'string' && r.script.trim() ? r.script.trim() : templateScript(data);
        if (r?.script) writeCache(appId, input, script);
        if (alive) setResult({ input, script });
      })
      .catch(() => alive && setResult({ input, script: templateScript(data) }));
    return () => { alive = false; };
  }, [appId, cached, data, enabled, input, result?.input]);

  const ready = cached ?? (result?.input === input ? result.script : null);
  return { script: ready, loading: enabled && !!data && !ready };
}
