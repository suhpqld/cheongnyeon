'use client';

// 03: 시연 기기 음성 시험 (토큰 없이 열린다, AI 호출 없음)
import { useRef, useState, useSyncExternalStore } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { useSpeechRecognition } from '@/lib/client/stt';

const SAMPLE = '안녕하세요, 복냥이예요. 한 달 월세 이십오만 원 맞아요?';

const noop = () => () => {};
function useClient<T>(get: () => T, server: T): T {
  return useSyncExternalStore(noop, get, () => server);
}

let voiceCache: { key: string; list: { name: string; lang: string }[] } = { key: '', list: [] };
function koreanVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return voiceCache.list;
  const all = window.speechSynthesis.getVoices().filter((v) => /^ko/i.test(v.lang));
  const key = all.map((v) => v.name + v.lang).join('|');
  if (key !== voiceCache.key) voiceCache = { key, list: all.map((v) => ({ name: v.name, lang: v.lang })) };
  return voiceCache.list;
}
function subscribeVoices(cb: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

function Row({ label, ok, children }: { label: string; ok: boolean | null; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-white p-3">
      <p className="text-[1.1rem] font-bold">
        {ok === null ? '⏳' : ok ? '✅' : '❌'} {label}
      </p>
      {children && <div className="mt-1 break-words">{children}</div>}
    </div>
  );
}

export default function Page() {
  const secure = useClient<boolean | null>(() => window.isSecureContext, null);
  const protocol = useClient(() => location.protocol, '');
  const userAgent = useClient(() => navigator.userAgent, '');
  const ttsSupported = useClient<boolean | null>(() => 'speechSynthesis' in window, null);
  const voices = useSyncExternalStore(subscribeVoices, koreanVoices, () => voiceCache.list);

  const startedAt = useRef(0);
  const [heard, setHeard] = useState<{ text: string; ms: number; error: string | null } | null>(null);
  const stt = useSpeechRecognition((text, error) => {
    setHeard({ text, ms: Date.now() - startedAt.current, error });
  });
  const [spoke, setSpoke] = useState<null | 'ok' | 'fail'>(null);

  const testMic = () => {
    setHeard(null);
    startedAt.current = Date.now();
    stt.start();
  };

  const testSpeak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return setSpoke('fail');
    synth.cancel();
    const u = new SpeechSynthesisUtterance(SAMPLE);
    u.lang = 'ko-KR';
    u.rate = 0.9;
    const ko = synth.getVoices().find((v) => /^ko/i.test(v.lang));
    if (ko) u.voice = ko;
    u.onend = () => setSpoke('ok');
    u.onerror = () => setSpoke('fail');
    synth.speak(u);
  };

  const errorText: Record<string, string> = {
    denied: '마이크 권한이 없어요. 주소창 옆 자물쇠에서 마이크를 허용해 주세요.',
    'no-speech': '아무 말도 안 들렸어요. 다시 말해 보세요.',
    network: '음성 인식 서버에 연결이 안 돼요. 인터넷을 확인해 주세요.',
    other: '음성 인식에 문제가 있어요.',
  };

  return (
    <AppShell back={{ href: '/' }} todo="이 기기에서 말하기와 읽어 주기가 되는지 확인해요" speakText={null}>
      <div className="grid gap-3">
        <h1>음성 시험</h1>

        <Row label="주소" ok={secure}>
          {secure === false ? 'HTTPS 주소에서 열어 주세요' : protocol}
        </Row>

        <Row label="음성 인식 지원" ok={secure === null ? null : stt.supported}>
          {secure !== null && !stt.supported && '이 브라우저는 음성 인식이 안 돼요. 크롬에서 열어 주세요.'}
        </Row>

        <Row label="마이크 시험" ok={heard ? !!heard.text : null}>
          {stt.listening && <p className="font-bold">듣고 있어요… {stt.interim}</p>}
          {heard?.text && (
            <p>
              받아 적은 글: <b>{heard.text}</b> ({(heard.ms / 1000).toFixed(1)}초)
            </p>
          )}
          {heard && !heard.text && <p>{errorText[heard.error ?? 'other']}</p>}
          <div className="mt-2">
            {stt.listening ? (
              <BigButton variant="secondary" icon="■" onClick={stt.stop}>다 말했어요</BigButton>
            ) : (
              <BigButton icon="🎤" onClick={testMic} disabled={!stt.supported}>말해 보기</BigButton>
            )}
          </div>
        </Row>

        <Row label="읽어 주기 지원" ok={ttsSupported}>
          {voices.length > 0 ? (
            <ul className="list-disc pl-5">
              {voices.map((v) => (
                <li key={v.name + v.lang}>
                  {v.name} ({v.lang})
                </li>
              ))}
            </ul>
          ) : (
            ttsSupported && <p>한국어 목소리를 찾지 못했어요. 기기 설정에서 한국어 음성을 받아 주세요.</p>
          )}
        </Row>

        <Row label="읽어 주기 시험" ok={spoke === null ? null : spoke === 'ok'}>
          <p>“{SAMPLE}”</p>
          <div className="mt-2">
            <BigButton variant="secondary" icon="🔊" onClick={testSpeak} disabled={!ttsSupported}>들어 보기</BigButton>
          </div>
        </Row>

        <Row label="브라우저" ok={userAgent ? true : null}>
          <p className="text-[0.9rem]">{userAgent}</p>
        </Row>

        <BigButton href="/dev/extract" variant="secondary">말 읽기 시험</BigButton>
      </div>
    </AppShell>
  );
}
