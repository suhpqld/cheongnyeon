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
  return <AppShell back={{ href: "/" }} todo="답을 확인할게요" speakText="질문">
    <div className="grid gap-3">
      <h1>질문</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/review'}>답을 확인할게요</BigButton>
    </div>
  </AppShell>;
}
