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
  return <AppShell back={{ href: base }} todo="내 신청 현황" speakText="주민센터 제출 완료">
    <div className="grid gap-3">
      <h1>주민센터 제출 완료</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base}>내 신청 현황</BigButton>
      <Disclaimer />
    </div>
  </AppShell>;
}
