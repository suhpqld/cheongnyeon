'use client';

import { OfficeLinks } from './PlaceGroups';
import { btn } from './styles';

type Place = { district: string | null; dong: string | null };

/** 03의 /api/card-script가 없거나 실패할 때 쓰는 틀 문장 */
export function fallbackScript(opts: {
  programName?: string;
  applicantType: string | null;
  householdSize: number | null;
  hasCheckTasks: boolean;
}): string {
  const parts = [`${opts.programName ?? '서울형 기초보장제도'} 신청하러 왔어요.`];
  if (opts.applicantType === 'family') parts.push('가족 대신 왔어요.');
  if (opts.householdSize) parts.push(`같이 사는 사람은 ${opts.householdSize}명이에요.`);
  if (opts.hasCheckTasks) parts.push('정확히 모르는 것이 있어서 같이 확인해 주세요.');
  return parts.join(' ');
}

export function supplementScript(names: string[]): string {
  return `추가 서류 내러 왔어요. ${names.join(', ')} 가져왔어요.`;
}

interface ScriptBoxProps {
  script: string | null;
  loading?: boolean;
  onSpeak?: (text: string) => void;
  /** 추가 요청 서류 이름 (없으면 빈 배열) */
  supplementNames: string[];
  /** 확인 필요한 칸 이름 */
  checkLabels: string[];
  place: Place;
}

export default function ScriptBox({ script, loading, onSpeak, supplementNames, checkLabels, place }: ScriptBoxProps) {
  const sub = supplementNames.length > 0 ? supplementScript(supplementNames) : null;
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border-[3px] border-primary bg-primary-soft p-5">
        <h3 className="text-[1rem] font-bold">주민센터 창구에서 이렇게 말하세요</h3>
        <p className="mt-3 text-[1.2rem] font-bold leading-relaxed" aria-live="polite">
          {loading ? '복냥이가 할 말을 정리하는 중이에요' : `“${script ?? ''}”`}
        </p>
        <button
          type="button"
          disabled={loading || !script}
          onClick={() => script && onSpeak?.(script)}
          className={btn.secondary + ' mt-4'}
        >
          🔊 읽어 주기
        </button>
      </div>

      {sub && (
        <div className="rounded-2xl border-[3px] border-warn bg-white p-5">
          <h3 className="text-[1rem] font-bold">추가 서류를 낼 때</h3>
          <p className="mt-3 text-[1.1rem] font-bold leading-relaxed">“{sub}”</p>
          <button type="button" onClick={() => onSpeak?.(sub)} className={btn.secondary + ' mt-4'}>
            🔊 읽어 주기
          </button>
        </div>
      )}

      {checkLabels.length > 0 && (
        <div className="rounded-2xl border-2 border-ink bg-white p-4">
          <h3 className="text-[1rem] font-bold">주민센터에서 같이 확인해 달라고 할 것</h3>
          <ul className="mt-2 list-disc pl-6 text-[1rem] leading-relaxed">
            {checkLabels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border-2 border-ink bg-white p-4">
        <h3 className="text-[1rem] font-bold">낼 곳</h3>
        <OfficeLinks place={place} />
      </div>

      <p className="text-[0.9rem] leading-relaxed">
        🖨 신청서를 쓸 때 옮겨 쓰는 카드를 보여 주거나 보면서 쓰면 돼요.
      </p>
    </section>
  );
}
