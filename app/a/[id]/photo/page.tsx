import { Suspense } from 'react';
import { PhotoPicker } from '@/components/extra/PhotoPicker';

type Props = { params: Promise<{ id: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">화면을 열고 있어요</p>}><Screen {...props} /></Suspense>;
}

async function Screen({ params }: Props) {
  const { id } = await params;
  return <PhotoPicker appId={id} />;
}
