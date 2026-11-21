import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';

export default function Page() {
  return <AppShell back={{ href: '/' }} todo="처음으로" speakText="예시 종이">
    <div className="grid gap-3">
      <h1>예시 종이</h1>
      <p>(준비 중이에요)</p>
      <BigButton href="/">처음으로</BigButton>
    </div>
  </AppShell>;
}
