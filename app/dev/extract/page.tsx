import { AppShell } from '@/components/ui/AppShell';
import { BigButton } from '@/components/ui/BigButton';

export default function Page() {
  return <AppShell back={{ href: '/' }} todo="음성 시험" speakText="말 읽기 시험">
    <div className="grid gap-3">
      <h1>말 읽기 시험</h1>
      <p>(준비 중이에요)</p>
      <BigButton href="/dev/voice">음성 시험</BigButton>
    </div>
  </AppShell>;
}
