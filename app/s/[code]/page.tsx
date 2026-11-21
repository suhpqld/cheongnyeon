import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';

export default function Page() {
  return <AppShell plain>
    <div className="grid gap-3">
      <h1>가족이 공유한 신청 준비</h1>
      <p>(준비 중이에요)</p>
      <BigButton href="/">처음으로</BigButton>
    </div>
  </AppShell>;
}
