import { Suspense } from 'react';
import { ExtraScreen } from '@/components/extra/ExtraScreen';

type Props = { params: Promise<{ id: string; sid: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">화면을 열고 있어요</p>}><Screen {...props} /></Suspense>;
}

async function Screen({ params }: Props) {
  const { id, sid } = await params;
  return <ExtraScreen appId={id} supplementId={sid} />;
}
