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
  return <AppShell back={{ href: base + '/q' }} todo="맞아요, 다음으로" speakText="신청서에 이렇게 적을게요">
    <div className="grid gap-3">
      <h1>신청서에 이렇게 적을게요</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/precheck'}>맞아요, 다음으로</BigButton>
      <BigButton href={base + '/q'} variant="secondary">고치기</BigButton>
    </div>
  </AppShell>;
}
