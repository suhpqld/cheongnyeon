'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import { Loading } from '@/components/ui/Loading';
import { apiFetch, ApiError } from '@/lib/client/api';
import { useSpeechRecognition, type SttError } from '@/lib/client/stt';
import { localExtract } from '@/lib/parse-korean';
import type { AnswerValue, ExtractRequest, ExtractResult, FormField, HelperMode } from '@/lib/types';
import { ListeningSheet } from './ListeningSheet';

// props 모양은 01이 정한 그대로 (02가 이 모양으로 부른다)
export interface MicButtonProps {
  appId: string;
  helperMode: HelperMode;
  field: FormField;
  otherFields: FormField[];
  clarify: { question: string; options: { label: string; value: AnswerValue }[] } | null;
  onResult: (result: ExtractResult, utterance: string) => void;
  onUnavailable?: (reason: 'unsupported' | 'denied' | 'limit') => void;
  disabled?: boolean;
}

type Mode = 'idle' | 'listening' | 'thinking' | 'retry' | 'denied' | 'limit';

const EXTRACT_TIMEOUT_MS = 20_000;

const MESSAGE = {
  unsupported: '이 브라우저에서는 말하기가 안 돼요. 버튼이나 글로 대답해 주세요.',
  denied: '마이크를 쓸 수 없어요. 주소창 옆 자물쇠를 눌러 마이크를 허용하거나, 버튼으로 대답해 주세요.',
  limit: '오늘은 말로 대답하기를 많이 썼어요. 버튼으로 대답해 주세요.',
  retry: '잘 안 들렸어요. 한 번 더 말해 주세요.',
};

function toRequest(p: MicButtonProps, utterance: string): ExtractRequest {
  return {
    appId: p.appId,
    utterance,
    helperMode: p.helperMode,
    field: {
      key: p.field.key,
      type: p.field.type,
      questionEasy: p.field.questionEasy,
      options: p.field.options,
      allowUnknown: p.field.allowUnknown,
      minValue: p.field.minValue,
      maxValue: p.field.maxValue,
    },
    otherFields: p.otherFields.map((f) => ({ key: f.key, type: f.type, questionEasy: f.questionEasy, options: f.options })),
    clarify: p.clarify,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export const MicButton: FC<MicButtonProps> = (props) => {
  const { disabled, onUnavailable } = props;
  const [mode, setMode] = useState<Mode>('idle');
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const handleDone = async (text: string, error: SttError) => {
    if (error === 'denied') {
      setMode('denied');
      propsRef.current.onUnavailable?.('denied');
      return;
    }
    if (!text) {
      setMode('retry');
      return;
    }
    setMode('thinking');
    const p = propsRef.current;
    try {
      const result = await withTimeout(
        apiFetch<ExtractResult>('/api/extract', { method: 'POST', body: toRequest(p, text) }),
        EXTRACT_TIMEOUT_MS,
      );
      setMode('idle');
      propsRef.current.onResult(result, text);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setMode('limit');
        propsRef.current.onUnavailable?.('limit');
        return;
      }
      // 네트워크, 500, 시간 초과 → 브라우저에서 직접 읽기 (못 읽으면 value null로 넘겨서 02가 되묻는다)
      setMode('idle');
      propsRef.current.onResult(localExtract(p.field, text), text);
    }
  };

  const stt = useSpeechRecognition(handleDone);
  const unsupported = !stt.supported;

  // 지원 안 되면 부모에게 한 번 알린다 (서버 렌더 뒤 브라우저에서 판단)
  const [reported, setReported] = useState(false);
  useEffect(() => {
    if (unsupported && !reported && typeof window !== 'undefined') {
      const t = setTimeout(() => {
        setReported(true);
        onUnavailable?.('unsupported');
      }, 0);
      return () => clearTimeout(t);
    }
  }, [unsupported, reported, onUnavailable]);

  if (unsupported) {
    return reported ? <p className="font-bold">{MESSAGE.unsupported}</p> : null;
  }
  if (mode === 'denied') return <p className="font-bold">{MESSAGE.denied}</p>;
  if (mode === 'limit') return <p className="font-bold">{MESSAGE.limit}</p>;
  if (mode === 'thinking') return <Loading text="복냥이가 알아듣는 중이에요" />;

  const listening = mode === 'listening' || stt.listening;
  const begin = () => {
    setMode('listening');
    stt.start();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {mode === 'retry' && <p className="font-bold" role="status">{MESSAGE.retry}</p>}
      {!listening && (
        <button
          type="button"
          onClick={begin}
          disabled={disabled}
          className="flex size-24 flex-col items-center justify-center rounded-full border-[3px] border-primary bg-primary text-center text-[0.9rem] font-bold leading-tight text-white disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-[1.4rem] leading-none">🎤</span>
          {mode === 'retry' ? <span>다시<br />말하기</span> : <span>말로<br />대답하기</span>}
        </button>
      )}
      {listening && <ListeningSheet interim={stt.interim} onStop={stt.stop} />}
    </div>
  );
};

export default MicButton;
