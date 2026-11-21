'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Loading } from '@/components/ui/Loading';
import { apiFetch } from '@/lib/client/api';
import { resizeNoticeImage } from '@/lib/client/image';
import { getSession } from '@/lib/client/session';
import { todayKST } from '@/lib/format';
import { sampleNoticeText } from '@/lib/demo/sample-notice';
import type { SupplementParsed } from '@/lib/types';

export function PhotoPicker({ appId }: { appId: string }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const album = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = `/a/${encodeURIComponent(appId)}`;

  function choose(picked?: File) {
    if (!picked) return;
    setError('');
    setFile(picked);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(picked));
    setTextMode(false);
  }

  async function submit(mode: 'photo' | 'text' | 'sample') {
    if (busy) return;
    if (getSession()?.appId !== appId) {
      setError('신청 내용을 찾을 수 없어요. 처음 화면에서 다시 이어서 해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const today = todayKST();
      const imageDataUrl = mode === 'photo' && file ? await resizeNoticeImage(file) : undefined;
      const text = mode === 'sample' ? sampleNoticeText(today) : mode === 'text' ? typed.trim() : undefined;
      if (!imageDataUrl && !text) throw new Error('사진이나 글을 넣어 주세요.');
      const parsed = await apiFetch<SupplementParsed>('/api/supplement/parse', {
        method: 'POST', body: { appId, imageDataUrl, text, today },
      });
      const saved = await apiFetch<{ supplementId: string }>(`/api/apps/${encodeURIComponent(appId)}/supplements`, {
        method: 'POST', body: { parsed, ...(mode === 'text' ? { sourceText: text } : {}) },
      });
      if (imageDataUrl) sessionStorage.setItem(`boknyang.photo.${saved.supplementId}`, imageDataUrl);
      router.push(`${base}/extra/${encodeURIComponent(saved.supplementId)}`);
    } catch (cause) {
      setError(cause instanceof Error && cause.message !== 'fetch failed'
        ? cause.message : '글씨를 잘 못 읽었어요. 조금 더 가까이, 밝은 곳에서 다시 찍어 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return <AppShell back={{ href: base }} todo="받은 종이를 사진으로 찍어 주세요"
    speakText="주민센터에서 받은 종이를 사진으로 찍어 주세요. 밝은 곳에서, 종이 전체가 나오게 찍어요.">
    <div className="grid gap-4">
      <h1>받은 종이를 보여 주세요</h1>
      <p className="rounded-xl bg-primary-soft p-4 text-center font-bold">받은 종이를 보여 주세요. 제가 쉽게 풀어 드릴게요.</p>
      {busy ? <Loading text="복냥이가 종이를 읽는 중이에요" /> : <>
        {preview && !textMode ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="고른 종이 미리보기" className="max-h-[440px] w-full rounded-xl border-2 border-line object-contain" />
          <BigButton onClick={() => void submit('photo')}>이 사진으로 할게요</BigButton>
          <BigButton variant="secondary" onClick={() => { setFile(null); setPreview(null); camera.current?.click(); }}>다시 찍기</BigButton>
        </> : textMode ? <>
          <label htmlFor="notice-text" className="font-bold">종이에 적힌 내용을 적어 주세요</label>
          <textarea id="notice-text" value={typed} onChange={event => setTyped(event.target.value)}
            placeholder="종이에 적힌 서류 이름과 날짜를 그대로 적어 주세요."
            className="min-h-48 w-full rounded-xl border-2 border-line bg-white p-3 text-xl" />
          <BigButton onClick={() => void submit('text')} disabled={!typed.trim()}>확인</BigButton>
        </> : <div className="rounded-xl border-2 border-dashed border-line p-5 text-center text-xl leading-loose">
          ☀ 밝은 곳에서<br />📄 종이 전체가 나오게<br />✋ 흔들리지 않게
        </div>}
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={event => choose(event.target.files?.[0])} />
        <input ref={album} type="file" accept="image/*" hidden onChange={event => choose(event.target.files?.[0])} />
        <BigButton onClick={() => camera.current?.click()}>📷 사진 찍기</BigButton>
        <BigButton variant="secondary" onClick={() => album.current?.click()}>🖼 앨범에서 고르기</BigButton>
        <BigButton variant="secondary" onClick={() => { setTextMode(true); setError(''); }}>✏️ 글로 적기</BigButton>
        <BigButton variant="secondary" onClick={() => void submit('sample')}>예시 종이로 해보기</BigButton>
      </>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    </div>
  </AppShell>;
}
