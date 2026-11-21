import { Suspense } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';

type Props = { params: Promise<{ id: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">화면을 열고 있어요</p>}>
    <Screen {...props} />
  </Suspense>;
}

async function Screen({ params }: Props) {
  const { id } = await params;
  const base = '/a/' + encodeURIComponent(id);
  return <AppShell back={{ href: base + '/precheck' }} todo="옮겨 쓰는 카드 출력" speakText="제출 준비 카드">
    <div className="grid gap-3">
      <h1>제출 준비 카드</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/print'}>옮겨 쓰는 카드 출력</BigButton>
      <BigButton href={base + '/visit'} variant="secondary">주민센터에 다녀왔어요</BigButton>
      <Disclaimer />
    </div>
  </AppShell>;
}
