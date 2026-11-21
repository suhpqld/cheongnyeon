
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page(props: Props) {
  return (
    <Suspense fallback={<p role="status">추가 서류 화면을 열고 있어요...</p>}>
      <ExtraRedirect {...props} />
    </Suspense>
  );
}

async function ExtraRedirect({ params }: Props): Promise<React.ReactNode> {
  const { id } = await params;

  redirect('/a/' + encodeURIComponent(id) + '/photo');
}
