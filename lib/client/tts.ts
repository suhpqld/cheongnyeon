'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { soundEnabled } from './settings';

let speaking = false;
let cancelPending: (() => void) | undefined;
const listeners = new Set<() => void>();

function setSpeaking(value: boolean) {
  speaking = value;
  listeners.forEach(listener => listener());
}

export function useSpeaking() {
  return useSyncExternalStore(callback => {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }, () => speaking, () => false);
}

export function stopSpeaking(): void {
  cancelPending?.();
  cancelPending = undefined;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  setSpeaking(false);
}

export function speak(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || !soundEnabled()) return;
  stopSpeaking();
  const sentences = text.trim().split(/(?<=[.!?요다])\s+/u).filter(Boolean);
  if (!sentences.length) return;
  const synth = window.speechSynthesis;
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let index = 0;

  function cleanup() {
    synth.removeEventListener('voiceschanged', start);
    clearTimeout(timer);
  }

  function start() {
    cleanup();
    const voice = synth.getVoices().find(item => item.lang.toLowerCase().startsWith('ko'));
    function next() {
      if (!active) return;
      const sentence = sentences[index++];
      if (!sentence) {
        stopSpeaking();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      if (voice) utterance.voice = voice;
      utterance.onend = next;
      utterance.onerror = () => { if (active) stopSpeaking(); };
      synth.speak(utterance);
    }
    next();
  }

  cancelPending = () => { active = false; cleanup(); };
  setSpeaking(true);
  if (synth.getVoices().length) start();
  else {
    synth.addEventListener('voiceschanged', start);
    timer = setTimeout(start, 350);
  }
}

export function useAutoSpeak(text: string | null): void {
  useEffect(() => {
    if (text && navigator.userActivation?.hasBeenActive) speak(text);
    return stopSpeaking;
  }, [text]);
}
