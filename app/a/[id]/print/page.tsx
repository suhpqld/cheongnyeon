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
  return <AppShell plain>
    <div className="grid gap-3">
      <h1>옮겨 쓰는 카드</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/card'}>제출 준비 카드</BigButton>
    </div>
  </AppShell>;
}
