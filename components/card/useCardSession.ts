'use client';

import { useSyncExternalStore } from 'react';
import { getSession } from '@/lib/client/session';

/** 이 신청 건의 세션이 이 브라우저에 있는지. 서버 렌더에서는 'loading' */
export function useCardSession(appId: string): 'loading' | 'missing' | { resumeCode: string } {
  const raw = useSyncExternalStore(
    () => () => {},
    () => {
      const s = getSession();
      return s && s.appId === appId ? s.resumeCode : '';
    },
    () => null,
  );
  if (raw === null) return 'loading';
  if (raw === '') return 'missing';
  return { resumeCode: raw };
}

export const NO_SESSION_TEXT = '이 신청 내용을 열 수 없어요. 이어서 하기 번호를 넣어 주세요.';
export const RETRY_TEXT = '잠깐 문제가 있어요. 다시 눌러 주세요.';
