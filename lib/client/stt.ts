'use client';

// 03: 브라우저 음성 인식 훅 (Web Speech API, ko-KR)
// HTTPS에서만 마이크가 된다 (localhost와 Vercel 주소는 됨).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { stopSpeaking } from './tts';

export type SttError = null | 'denied' | 'no-speech' | 'network' | 'other';

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 서버 렌더와 첫 화면이 같게: 서버에서는 false */
export function useSttSupported(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => getCtor() !== null,
    () => false,
  );
}

function mapError(code: string): SttError {
  if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') return 'denied';
  if (code === 'no-speech') return 'no-speech';
  if (code === 'network') return 'network';
  if (code === 'aborted') return null;
  return 'other';
}

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  interim: string;
  finalText: string;
  error: SttError;
  start(): void;
  stop(): void;
}

/**
 * @param onDone 말이 끝나서 멈췄을 때 (받아 적은 글, 오류). 글이 없으면 ''
 */
export function useSpeechRecognition(
  onDone?: (text: string, error: SttError) => void,
): SpeechRecognitionState {
  const supported = useSttSupported();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState<SttError>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    stopSpeaking();
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalPart = '';
    let interimPart = '';
    let err: SttError = null;

    rec.onresult = (e) => {
      interimPart = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalPart += r[0].transcript;
        else interimPart += r[0].transcript;
      }
      setInterim((finalPart + interimPart).trim());
    };
    rec.onerror = (e) => {
      err = mapError(e.error);
      if (err) setError(err);
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      // 휴대폰 크롬은 final 없이 끝날 때가 있어서 중간 글도 쓴다
      const text = (finalPart || interimPart).trim();
      setFinalText(text);
      setListening(false);
      const reported = !text && !err ? 'no-speech' : text ? null : err;
      if (!text && reported) setError(reported);
      doneRef.current?.(text, reported);
    };

    recRef.current = rec;
    setInterim('');
    setFinalText('');
    setError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
      setError('other');
      doneRef.current?.('', 'other');
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { supported, listening, interim, finalText, error, start, stop };
}
