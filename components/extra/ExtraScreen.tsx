'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Loading } from '@/components/ui/Loading';
import { ShareButton } from '@/components/share/ShareButton';
import { apiFetch } from '@/lib/client/api';
import { formatDateKo } from '@/lib/format';
import type { ChecklistItem, Supplement } from '@/lib/types';
import { DeadlineConfirm } from './DeadlineConfirm';
import { ExtraItem } from './ExtraItem';
import { HardWords } from './HardWords';

type Detail = { supplement: Supplement; items: ChecklistItem[] };

export function ExtraScreen({ appId, supplementId }: { appId: string; supplementId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = `/a/${encodeURIComponent(appId)}`;
  const path = `/api/apps/${encodeURIComponent(appId)}/supplements/${encodeURIComponent(supplementId)}`;

  useEffect(() => {
    let active = true;
    apiFetch<Detail>(path).then(value => { if (active) setDetail(value); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '추가 서류를 불러오지 못했어요.'); });
    setPhoto(sessionStorage.getItem(`boknyang.photo.${supplementId}`));
    return () => { active = false; };
  }, [path, supplementId]);

  async function patch(changes: { deadline?: string; deadlineConfirmed?: true; submitted?: true }) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch<{ supplement: Supplement }>(path, { method: 'PATCH', body: changes });
      setDetail(previous => previous && { ...previous, supplement: result.supplement });
      if (changes.submitted) router.push(`${base}/done`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      setConfirmSubmit(false);
    }
  }

  const supplement = detail?.supplement;
  const parsed = supplement?.parsed;
  const summary = parsed && supplement?.deadlineConfirmed && supplement.deadline && supplement.deadline !== parsed.deadline
    ? `확인한 날짜는 ${formatDateKo(supplement.deadline)}이에요. 서류 ${parsed.items.length}개를 ${parsed.officeName ?? '종이에 적힌 곳'}에 내 주세요.`
    : parsed?.summaryEasy;
  const todo = supplement?.deadlineConfirmed && supplement.deadline
    ? `추가 서류를 ${formatDateKo(supplement.deadline)}까지 내 주세요`
    : '종이에 적힌 날짜와 같은지 확인해 주세요';

  return <AppShell back={{ href: base }} todo={todo} speakText={summary ?? '추가로 챙길 서류'}>
    <div className="grid gap-4">
      <h1>추가로 챙길 서류</h1>
      {!detail && !error && <Loading text="추가 서류를 불러오는 중이에요" />}
      {supplement && parsed && <>
        <DeadlineConfirm deadline={supplement.deadline} original={parsed.deadlineOriginalText}
          confirmed={supplement.deadlineConfirmed} busy={busy}
          onConfirm={deadline => void patch({ ...(deadline ? { deadline } : {}), deadlineConfirmed: true })} />
        <section className="grid gap-3">
          <h2>추가로 챙길 서류 {parsed.items.length}개</h2>
          {parsed.items.map((item, index) => <ExtraItem key={`${index}-${item.name}`} item={item} checklist={detail.items} />)}
        </section>
        <section className="rounded-xl bg-white p-4">
          <h2>어디에 내나요</h2>
          <p>{parsed.officeName ?? '받은 종이에서 확인해 주세요.'}</p>
          {parsed.officeContact && <a className="block py-3 font-bold underline" href={`tel:${parsed.officeContact}`}>📞 전화하기</a>}
        </section>
        <section className="rounded-xl bg-white p-4"><h2>쉽게 말하면</h2><p>{summary}</p></section>
        <HardWords words={parsed.hardWords} />
        {parsed.consequenceEasy && <section className="rounded-xl bg-white p-4"><h2>기한을 넘기면</h2><p>{parsed.consequenceEasy}</p></section>}
        {photo && <>
          <BigButton variant="secondary" onClick={() => setShowPhoto(value => !value)}>📷 원래 사진 보기</BigButton>
          {showPhoto && <img src={photo} alt="원래 종이 사진" className="w-full rounded-xl" />}
        </>}
        <p className="rounded-xl bg-amber-50 p-3">사진에서 읽은 내용이라 틀릴 수 있어요. 받은 종이와 꼭 같이 확인하세요.</p>
        <BigButton variant="secondary" href={`${base}/card`}>📋 준비 카드에서 보기</BigButton>
        <ShareButton appId={appId} />
        <BigButton disabled={!supplement.deadlineConfirmed || busy} onClick={() => setConfirmSubmit(true)}>✅ 추가 서류를 냈어요</BigButton>
        <BigButton variant="secondary" href={`${base}/photo`}>✏️ 내용이 틀렸어요</BigButton>
        <Disclaimer />
      </>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      <ConfirmModal open={confirmSubmit} title="주민센터에 추가 서류를 내셨어요?" body="낸 것이 맞으면 제출 완료로 표시할게요."
        confirmLabel="네, 냈어요" cancelLabel="아니요" onCancel={() => setConfirmSubmit(false)}
        onConfirm={() => void patch({ submitted: true })} />
    </div>
  </AppShell>;
}
