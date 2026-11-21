import type { CSSProperties } from 'react';
import { isVisible } from '@/lib/rules/condition';
import type { AnswerMap, FormField } from '@/lib/types';

export interface FormSlot {
  id: string;
  fieldKey: string | null;
  localOnly?: 'name' | 'rrn' | 'phone' | 'signature' | null;
  page?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  render?: 'text' | 'check';
  checkValue?: string | null;
  fontPt?: number;
}

interface SharedProps {
  imageSrc: string;
  imageAlt: string;
  slots: readonly FormSlot[];
  fields: readonly FormField[];
  answers: AnswerMap;
  page?: number;
}

export type FormOverlayProps = SharedProps & (
  | { mode: 'input'; selectedFieldKey?: string | null; onSelectField: (fieldKey: string) => void }
  | { mode: 'output'; localValues?: Partial<Record<'name' | 'rrn' | 'phone', string>> }
);

const localLabels = {
  name: '이름',
  rrn: '주민등록번호',
  phone: '전화번호',
  signature: '서명',
};

export function FormOverlay(props: FormOverlayProps) {
  const { imageSrc, imageAlt, slots, fields, answers, page = 1 } = props;
  const byKey = new Map(fields.map((field) => [field.key, field]));
  return (
    <div className="relative w-full [container-type:inline-size]">
      {/* The image establishes the coordinate space using its intrinsic proportions. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={imageAlt} className="block h-auto w-full" />
      {slots.filter((slot) => (slot.page ?? 1) === page).map((slot) => {
        const field = slot.fieldKey ? byKey.get(slot.fieldKey) : undefined;
        const answer = slot.fieldKey ? answers[slot.fieldKey] : undefined;
        const local = slot.localOnly;
        if (props.mode === 'input' && !field && !local) return null;
        if (!local && field && !isVisible(field, answers)) return null;

        const needsCheck = answer?.value === 'unknown' || answer?.isApproximate === true;
        const value = answer?.value;
        let content = '';
        if (local) {
          if (props.mode === 'input') content = local === 'signature' ? '주민센터에서 서명해요' : '출력할 때 적어요';
          else if (local !== 'signature') content = props.localValues?.[local] ?? '';
        } else if (!needsCheck && value !== undefined) {
          if (slot.render === 'check') content = String(value) === slot.checkValue ? '✓' : '';
          else if (field?.type === 'money' && typeof value === 'number') content = value.toLocaleString('ko-KR');
          else if (typeof value === 'boolean') content = value ? '예' : '아니요';
          else content = field?.options?.find((option) => option.value === value)?.label ?? String(value);
        }
        const style: CSSProperties = {
          left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%`,
          fontSize: `${(slot.fontPt ?? 10) * 0.224}cqw`,
        };
        const className = 'absolute flex items-center justify-center overflow-hidden px-[1%] text-center leading-tight';
        if (props.mode === 'input' && field && !local) {
          const label = needsCheck ? '확인 후 적기' : content;
          return (
            <button key={slot.id} type="button" style={style}
              className={`${className} border border-line bg-white/90 font-bold aria-pressed:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary`}
              aria-label={label ? `${field.label}: ${label}` : field.label}
              aria-pressed={props.selectedFieldKey === field.key}
              onClick={() => props.onSelectField(field.key)}>
              {label || (slot.render === 'check' ? '□' : field.label)}
            </button>
          );
        }
        return (
          <span key={slot.id} style={style}
            className={`${className} ${local && props.mode === 'input' ? 'bg-zinc-100 text-ink' : ''}`}
            aria-label={local && props.mode === 'input' ? `${localLabels[local]}: ${content}` : undefined}>
            {content}
            {!local && needsCheck && <small className="ml-auto text-right">확인 후 적기</small>}
          </span>
        );
      })}
    </div>
  );
}
