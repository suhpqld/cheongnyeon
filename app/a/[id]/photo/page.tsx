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
  return <AppShell back={{ href: base }} todo="예시로 해보기" speakText="받은 종이를 보여 주세요">
    <div className="grid gap-3">
      <h1>받은 종이를 보여 주세요</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/extra/preview'}>예시로 해보기</BigButton>
      <BigButton href="/demo/notice" variant="secondary">예시 종이</BigButton>
    </div>
  </AppShell>;
}
