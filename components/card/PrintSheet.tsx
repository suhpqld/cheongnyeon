import { groupByPlace } from '@/lib/rules/checklist';
import { PLACE_LABEL, SECTION_ORDER } from '@/lib/constants';
import { formatDateKo } from '@/lib/format';
import type { Answer, AnswerMap, ChecklistItem, FormField } from '@/lib/types';

export interface PrintRow {
  key: string;
  label: string;       // 공식 칸 이름
  value: string;       // 적을 내용 (확인 필요면 빈 문자열)
  needsCheck: boolean;
  note: string | null; // "□ 확인 필요: ..." 또는 "(확인 필요)"
}

export interface PrintSection {
  section: string;
  rows: PrintRow[];
}

/** checkGuide를 짧게 (첫 문장) */
function shortGuide(g: string | null): string {
  if (!g) return '주민센터에서 같이 확인해요';
  const first = g.split(/(?<=[.요])\s/)[0];
  return first.length > 40 ? first.slice(0, 40) + '…' : first;
}

/**
 * 보이는 질문만 섹션 순서대로 표 줄로 만든다.
 * display는 01의 displayAnswer (isApproximate면 "약 30만 원 (확인 필요)").
 */
export function buildPrintSections(
  visible: FormField[],
  answers: AnswerMap,
  display: (field: FormField, a?: Answer) => string,
): PrintSection[] {
  return SECTION_ORDER.map((section) => ({
    section,
    rows: visible
      .filter((f) => f.section === section)
      .map((f): PrintRow => {
        const a = answers[f.key];
        if (!a) return { key: f.key, label: f.label, value: '', needsCheck: true, note: '□ 아직 안 적었어요' };
        if (a.value === 'unknown')
          return { key: f.key, label: f.label, value: '', needsCheck: true, note: `□ 확인 필요: ${shortGuide(f.checkGuide)}` };
        return { key: f.key, label: f.label, value: display(f, a), needsCheck: a.isApproximate, note: null };
      }),
  })).filter((s) => s.rows.length > 0);
}

interface PrintSheetProps {
  today: string;
  name: string;
  phone: string;
  sections: PrintSection[];
  checklist: ChecklistItem[];
  supplement: { deadline: string | null; names: string[] } | null;
  script: string | null;
}

const BLANK = '________________';

export const PRINT_FOOTER =
  '복냥이로 정리한 참고 자료예요. 신청서를 쓸 때 보면서 옮겨 쓰거나 담당자에게 보여 주세요. 받을 수 있는지는 구청 조사 후 정해져요.';

/** 옮겨 쓰는 카드 본문. 폰에서는 큰 글씨, 인쇄하면 A4 한 장 */
export default function PrintSheet({ today, name, phone, sections, checklist, supplement, script }: PrintSheetProps) {
  const groups = groupByPlace(checklist);
  const manyDocs = checklist.length > 10;
  return (
    <article className="print-sheet bg-white p-4 text-[1rem] leading-relaxed text-black print:p-0 print:text-[12pt] print:leading-snug">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          .print-sheet table, .print-sheet section { break-inside: avoid; }
        }
      `}</style>

      <h1 className="text-[1.2rem] font-bold leading-snug print:text-[15pt]">
        옮겨 쓰는 카드: 사회보장급여 신청서 (서울형 기초보장제도)
      </h1>
      <p className="mt-1">작성일 {formatDateKo(today)}</p>

      <section className="mt-4 print:mt-2">
        <h2 className="font-bold">신청인</h2>
        <table className="mt-1 w-full border-collapse">
          <tbody>
            <tr>
              <th className="w-[40%] border border-black p-2 text-left print:p-1">이름</th>
              <td className="border border-black p-2 print:p-1">{name.trim() || BLANK}</td>
            </tr>
            <tr>
              <th className="border border-black p-2 text-left print:p-1">전화번호</th>
              <td className="border border-black p-2 print:p-1">{phone.trim() || BLANK}</td>
            </tr>
            <tr>
              <th className="border border-black p-2 text-left print:p-1">주민등록번호</th>
              <td className="border border-black p-2 print:p-1">주민센터에서 직접 써 주세요</td>
            </tr>
          </tbody>
        </table>
      </section>

      {sections.map((s) => (
        <section key={s.section} className="mt-4 print:mt-2">
          <h2 className="font-bold">{s.section}</h2>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className="w-[40%] border border-black p-2 text-left print:p-1">공식 칸 이름</th>
                <th className="border border-black p-2 text-left print:p-1">적을 내용</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.key}>
                  <td className="border border-black p-2 align-top print:p-1">{r.label}</td>
                  <td className="border border-black p-2 align-top print:p-1">
                    {r.value}
                    {r.note && <span className="block font-bold">{r.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {groups.length > 0 && (
        <section className="mt-4 print:mt-2">
          <h2 className="font-bold">챙길 서류</h2>
          <div className={manyDocs ? 'print:columns-2 print:gap-6' : ''}>
            {groups.map((g) => (
              <div key={g.placeGroup} className="mt-1 break-inside-avoid">
                <p className="font-bold">{PLACE_LABEL[g.placeGroup].title}</p>
                <ul>
                  {[...g.pending, ...g.done].map((i) => (
                    <li key={i.id}>
                      {i.isDone ? '☑' : '□'} {i.docName}
                      {i.isDone ? ' (챙겼어요)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {supplement && supplement.names.length > 0 && (
        <section className="mt-4 print:mt-2">
          <h2 className="font-bold">
            추가로 챙길 서류{supplement.deadline ? ` (${formatDateKo(supplement.deadline)}까지)` : ''}
          </h2>
          <ul>
            {supplement.names.map((n) => (
              <li key={n}>□ {n}</li>
            ))}
          </ul>
        </section>
      )}

      {script && (
        <section className="mt-4 print:mt-2">
          <h2 className="font-bold">주민센터에서 할 말</h2>
          <p>“{script}”</p>
        </section>
      )}

      <p className="mt-6 border-t-2 border-black pt-2 print:mt-3 print:text-[10.5pt]">{PRINT_FOOTER}</p>
    </article>
  );
}
