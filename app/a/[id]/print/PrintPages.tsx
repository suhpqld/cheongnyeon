'use client';

// S5 출력 두 장: 1장 미리 채운 공식 신청서, 2장 준비 카드
import type { PrintData } from '@/app/api/apps/[id]/print/route';
import { CHECK_LATER, type FormSection, type LocalValues } from '@/app/api/apps/[id]/print/form-values';
import { DISCLAIMER, PLACE_LABEL } from '@/lib/constants';
import { formatDateKo, todayKST } from '@/lib/format';
import { groupByPlace, officeName } from '@/lib/rules/checklist';
import FormOverlay from './FormOverlayTemp';

export const ACCEPT_NOTICE = '집에서 미리 채운 신청서를 가져가도 접수돼요 (120 다산콜 확인). 서류와 함께 주민센터에 내세요.';

const cell = 'border border-black p-2 align-top print:px-1.5 print:py-1';

function Note({ text }: { text: string }) {
  return (
    <span className="ml-1 inline-block rounded-sm border border-dashed border-black px-1 text-[0.8em] font-bold">{text}</span>
  );
}

function RowsTable({ sections }: { sections: FormSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.section} className="mt-3 break-inside-avoid print:mt-2">
          <h3 className="font-bold">{s.section}</h3>
          <table className="mt-1 w-full border-collapse">
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.key}>
                  <th className={cell + ' w-[42%] text-left font-normal'}>{r.label}</th>
                  <td className={cell}>
                    {r.text}
                    {r.note && <Note text={r.note} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}

/** 1장. 양식 그림이 있으면 그 위에 겹치고, 아직 없으면 신청서 칸 순서대로 표 */
export function FormPage({ data, local }: { data: PrintData; local: LocalValues }) {
  if (data.templates.length > 0) {
    // 공식 양식의 모든 쪽을 한 장씩 (신청서 1~3쪽 ...)
    return (
      <>
        {data.templates.flatMap((template) =>
          template.pageImages.map((_, i) => (
            <div key={`${template.code}-${i}`} className="print-page">
              <FormOverlay template={template} mode="print" page={i + 1} localValues={local} />
            </div>
          )),
        )}
      </>
    );
  }
  const v = (s?: string) => s?.trim() ?? '';
  return (
    <div className="print-page bg-white p-4 text-[1rem] leading-relaxed text-black print:p-0 print:text-[10.5pt] print:leading-snug">
      <h2 className="text-[1.2rem] font-bold leading-snug print:text-[14pt]">사회보장급여 신청서 (서울형 기초보장제도)</h2>
      <p className="text-[0.9em]">미리 채운 내용 · 작성일 {formatDateKo(todayKST())}</p>
      <section className="mt-3 print:mt-2">
        <h3 className="font-bold">신청인</h3>
        <table className="mt-1 w-full border-collapse">
          <tbody>
            <tr>
              <th className={cell + ' w-[42%] text-left font-normal'}>성명</th>
              <td className={cell}>{v(local.name)}</td>
            </tr>
            <tr>
              <th className={cell + ' text-left font-normal'}>주민등록번호</th>
              <td className={cell}>{v(local.rrn)}</td>
            </tr>
            <tr>
              <th className={cell + ' text-left font-normal'}>전화번호</th>
              <td className={cell}>{v(local.phone)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <RowsTable sections={data.leftover} />
      <section className="mt-3 break-inside-avoid print:mt-2">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <th className={cell + ' w-[42%] text-left font-normal'}>신청인 서명</th>
              <td className={cell + ' h-14'}>
                <span className="text-[0.8em] text-[#666] print:hidden">주민센터에서 직접 서명해요</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <p className="mt-2 text-[0.85em]">“{CHECK_LATER}” 칸은 확인한 뒤 직접 적어 주세요.</p>
    </div>
  );
}

/** "약 30만 원 (확인 필요)" → "약 30만 원" */
const said = (display: string) => display.replace(/\s*\(확인 필요\)$/, '');

/** 2장. 준비 카드 */
export function ReadyCardPage({ data, script }: { data: PrintData; script: string | null }) {
  const groups = groupByPlace(data.checklist);
  const hasForm = data.templates.length > 0;
  const many = data.checklist.length > 8;
  return (
    <div className="print-page bg-white p-4 text-[1rem] leading-relaxed text-black print:p-0 print:text-[10.5pt] print:leading-snug">
      <h2 className="text-[1.2rem] font-bold leading-snug print:text-[14pt]">준비 카드: {data.programName}</h2>
      <p className="mt-1 rounded border-2 border-black p-2 font-bold print:p-1.5">{ACCEPT_NOTICE}</p>
      <p className="mt-2">
        <b>낼 곳:</b> {officeName(data.place)} · 작성일 {formatDateKo(todayKST())}
      </p>

      {groups.length > 0 && (
        <section className="mt-3 print:mt-2">
          <h3 className="font-bold">챙길 서류</h3>
          <div className={many ? 'print:columns-2 print:gap-6' : ''}>
            {groups.map((g) => (
              <div key={g.placeGroup} className="mt-1 break-inside-avoid">
                <p className="font-bold">{PLACE_LABEL[g.placeGroup].title}</p>
                <ul>
                  {[...g.pending, ...g.done].map((i) => (
                    <li key={i.id}>
                      {i.isDone ? '☑' : '□'} {i.docName}
                      {i.issuePlace ? ` (${i.issuePlace})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.checkTasks.length > 0 && (
        <section className="mt-3 break-inside-avoid print:mt-2">
          <h3 className="font-bold">확인 후 적을 칸</h3>
          <ul>
            {data.checkTasks.map((t) => (
              <li key={t.key}>
                □ <b>{t.label}</b>: 말씀하신 값 {said(t.display)}. {t.checkGuide ?? '주민센터에서 같이 확인해요.'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasForm && data.leftover.length > 0 && (
        <section className="mt-3 print:mt-2">
          <h3 className="font-bold">신청서 다른 쪽에 옮겨 쓸 칸</h3>
          <RowsTable sections={data.leftover} />
        </section>
      )}

      {script && (
        <section className="mt-3 break-inside-avoid print:mt-2">
          <h3 className="font-bold">주민센터에서 할 말</h3>
          <p>“{script}”</p>
        </section>
      )}

      <p className="mt-4 border-t-2 border-black pt-2 text-[0.9em] print:mt-3">{DISCLAIMER}</p>
    </div>
  );
}
