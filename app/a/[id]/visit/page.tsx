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
  return <AppShell back={{ href: base + '/card' }} todo="서류를 다 냈어요" speakText="주민센터에 다녀오셨어요?">
    <div className="grid gap-3">
      <h1>주민센터에 다녀오셨어요?</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/done'}>서류를 다 냈어요</BigButton>
      <BigButton href={base + '/photo'} variant="secondary">서류를 더 내래요</BigButton>
    </div>
  </AppShell>;
}
