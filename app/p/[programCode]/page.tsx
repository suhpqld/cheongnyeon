import { Suspense } from 'react';
import ProgramStart from './ProgramStart';

type Props = { params: Promise<{ programCode: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status">화면을 열고 있어요</p>}>
    <Screen {...props} />
  </Suspense>;
}

async function Screen({ params }: Props) {
  const { programCode } = await params;
  return <ProgramStart programCode={programCode} />;
}
