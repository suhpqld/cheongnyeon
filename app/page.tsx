import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';
import { Boknyang } from '@/components/ui/Boknyang';

export default function Home() {
  return <AppShell showHome={false} todo="할 일을 골라 주세요" speakText="안녕하세요, 복냥이예요. 할 일을 골라 주세요.">
    <div className="grid justify-items-center gap-3">
      <Boknyang mood="happy" />
      <h1>복냥이</h1>
      <BigButton href="/intro">신청서 쓰기</BigButton>
      <BigButton href="/supplement" variant="secondary">서류를 더 내래요</BigButton>
      <BigButton href="/resume" variant="secondary">번호로 이어서 하기</BigButton>
    </div>
  </AppShell>;
}
