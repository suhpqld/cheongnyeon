'use client';

import { BigButton } from './BigButton';

interface NumberPadBaseProps {
  value: string;
  onChange: (value: string) => void;
  submitLabel?: string;
  maxLength?: number;
}

type NumberPadProps = NumberPadBaseProps & (
  | { mode: 'code'; onSubmit: (value: string) => void }
  | { mode: 'money' | 'count'; onSubmit: (value: number) => void }
);

export function NumberPad(props: NumberPadProps) {
  const { mode, value, onChange, submitLabel = '확인', maxLength } = props;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0'];
  const limit = maxLength ?? (mode === 'code' ? 8 : 10);
  const amount = Number(value) * (mode === 'money' ? 10_000 : 1);
  const canSubmit = value.length > 0 && (mode === 'code' || Number.isSafeInteger(amount));

  function press(key: string) {
    if (key === '지우기') onChange(value.slice(0, -1));
    else if (value.length < limit) onChange(value + key);
  }

  function submit() {
    if (props.mode === 'code') props.onSubmit(value);
    else props.onSubmit(amount);
  }

  return <div className="grid gap-3">
    <output className="rounded-xl border-[3px] border-line bg-white p-2 text-center font-bold" aria-live="polite">
      {mode === 'money' ? (value || '0') + '만 원' : value || '숫자를 눌러 주세요'}
    </output>
    <div className="grid grid-cols-3 gap-3">
      {keys.map(key => <BigButton key={key} variant="secondary" onClick={() => press(key)}>{key}</BigButton>)}
      <BigButton disabled={!canSubmit} onClick={submit}>{submitLabel}</BigButton>
    </div>
  </div>;
}

export default NumberPad;
