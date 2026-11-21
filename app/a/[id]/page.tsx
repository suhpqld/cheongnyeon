import { Suspense } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';

type Props = { params: Promise<{ id: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">화면을 열고 있어요</p>}>
    <Screen {...props} />
  </Suspense>;
}

async function Screen({ params }: Props) {
  const { id } = await params;
  const base = '/a/' + encodeURIComponent(id);
  return <AppShell back={{ href: "/" }} todo="질문" speakText="내 신청 현황">
    <div className="grid gap-3">
      <h1>내 신청 현황</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/q'}>질문</BigButton>
      <BigButton href={base + '/card'} variant="secondary">제출 준비 카드</BigButton>
    </div>
  </AppShell>;
}
