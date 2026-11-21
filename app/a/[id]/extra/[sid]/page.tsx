import { Suspense } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Disclaimer } from '@/components/ui/Disclaimer';

type Props = { params: Promise<{ id: string; sid: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">화면을 열고 있어요</p>}>
    <Screen {...props} />
  </Suspense>;
}

async function Screen({ params }: Props) {
  const { id } = await params;
  const base = '/a/' + encodeURIComponent(id);
  return <AppShell back={{ href: base + '/photo' }} todo="추가 서류를 냈어요" speakText="추가로 챙길 서류">
    <div className="grid gap-3">
      <h1>추가로 챙길 서류</h1>
      <p>(준비 중이에요)</p>
      <BigButton href={base + '/done'}>추가 서류를 냈어요</BigButton>
      <Disclaimer />
    </div>
  </AppShell>;
}
