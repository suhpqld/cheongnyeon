'use client';

// ⚠ 임시 부품: 이건희가 components/form/FormOverlay.tsx를 만들면 그걸로 바꾼다 (props 모양 그대로).
// 공식 양식 그림 위에 칸마다 값을 겹쳐 보여 준다. x, y, w, h는 그림 대비 퍼센트.
import { CHECK_LATER, type FormSlotView, type FormTemplateView, type LocalValues } from '@/app/api/apps/[id]/print/form-values';

export interface FormOverlayProps {
  template: FormTemplateView;
  /** edit: 칸을 눌러 입력 (S3 양식 모드) / print: 출력용 (S5) */
  mode: 'edit' | 'print';
  /** 몇 쪽 (1부터). 기본 1 */
  page?: number;
  /** 출력 화면에서만 타이핑한 이름, 주민등록번호, 전화번호 (저장하지 않는다) */
  localValues?: LocalValues;
  onSlotClick?: (slot: FormSlotView) => void;
}

/** A4 너비 595.28pt 기준으로 글자 크기를 그림 너비에 맞춘다 */
const ptToCqw = (pt: number) => `${(pt / 595.28) * 100}cqw`;

function slotText(slot: FormSlotView, local: LocalValues): string {
  if (slot.localOnly === 'signature') return '';
  if (slot.localOnly) return local[slot.localOnly]?.trim() ?? '';
  return slot.value.text;
}

export default function FormOverlay({ template, mode, page = 1, localValues = {}, onSlotClick }: FormOverlayProps) {
  const src = template.pageImages[page - 1];
  if (!src) return null;
  const slots = template.slots.filter((s) => s.page === page);

  return (
    <div className="relative w-full bg-white text-black" style={{ containerType: 'inline-size' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 인쇄할 때 원본 크기 그대로 써야 해서 img를 쓴다 */}
      <img src={src} alt={`${template.name} ${page}쪽`} className="block h-auto w-full select-none" draggable={false} />
      {slots.map((slot) => {
        const style = {
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          width: `${slot.w}%`,
          height: `${slot.h}%`,
          fontSize: ptToCqw(slot.fontPt),
        };
        const text = slotText(slot, localValues);
        const content =
          slot.render === 'check' ? (
            slot.value.checked ? <span className="font-bold">✓</span> : null
          ) : slot.localOnly === 'signature' ? (
            // 서명 칸은 비워 둔다. 안내는 화면에서만 보이고 인쇄에는 안 나온다
            <span className="text-[0.7em] text-[#666] print:hidden">주민센터에서 직접 서명해요</span>
          ) : (
            <span className="truncate">{text}</span>
          );
        const mark = slot.value.needsCheck && !text && (
          <span className="rounded-sm border border-dashed border-black px-[0.2em] text-[0.75em] leading-none">{CHECK_LATER}</span>
        );
        const cls =
          'absolute flex items-center overflow-hidden leading-none ' + (slot.render === 'check' ? 'justify-center' : 'px-[0.3em]');
        if (mode === 'edit' && onSlotClick && !slot.localOnly) {
          return (
            <button key={slot.id} type="button" style={style} className={cls + ' bg-primary-soft/40 text-left'} onClick={() => onSlotClick(slot)}>
              {content}
              {mark}
            </button>
          );
        }
        return (
          <div key={slot.id} style={style} className={cls}>
            {content}
            {mark}
          </div>
        );
      })}
    </div>
  );
}
