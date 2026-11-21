'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '../constants';

type Sound = 'on' | 'off';
type FontSize = 'normal' | 'large';
const eventName = 'boknyang-settings';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(eventName, callback);
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
