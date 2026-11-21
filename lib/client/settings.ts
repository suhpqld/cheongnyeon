'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '../constants';

type Sound = 'on' | 'off';
type FontSize = 'normal' | 'large';
export type ViewMode = 'pc' | 'mobile';

/** 이 폭 이상이면 처음에 PC 화면으로 (app/layout.tsx의 스크립트와 같은 값) */
export const PC_MIN_WIDTH = 900;
const eventName = 'boknyang-settings';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(eventName, callback);
  window.addEventListener('resize', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(eventName, callback);
    window.removeEventListener('resize', callback);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event(eventName));
}

export function soundEnabled(): boolean {
  return read(STORAGE_KEYS.sound) !== 'off';
}

/** 저장한 보기가 있으면 그것, 없으면 화면 폭으로 */
function currentView(): ViewMode {
  const saved = read(STORAGE_KEYS.view);
  if (saved === 'pc' || saved === 'mobile') return saved;
  return window.innerWidth >= PC_MIN_WIDTH ? 'pc' : 'mobile';
}

/** PC 화면 / 모바일 화면. <html class="view-pc">로 적용한다 */
export function useViewMode() {
  const view = useSyncExternalStore<ViewMode | null>(subscribe, currentView, () => null);
  useEffect(() => {
    if (view) document.documentElement.classList.toggle('view-pc', view === 'pc');
  }, [view]);
  return { view, setView: (value: ViewMode) => save(STORAGE_KEYS.view, value) };
}

export function useSettings() {
  const sound = useSyncExternalStore<Sound>(subscribe, () => soundEnabled() ? 'on' : 'off', () => 'on');
  const fontSize = useSyncExternalStore<FontSize>(
    subscribe, () => read(STORAGE_KEYS.fontSize) === 'large' ? 'large' : 'normal', () => 'normal',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('text-large', fontSize === 'large');
  }, [fontSize]);

  return {
    sound, fontSize,
    setSound: (value: Sound) => save(STORAGE_KEYS.sound, value),
    setFontSize: (value: FontSize) => save(STORAGE_KEYS.fontSize, value),
  };
}
