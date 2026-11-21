'use client';

import { useId, useState } from 'react';
import { FormOverlay, type FormSlot } from '@/components/form/FormOverlay';
import { BigButton } from '@/components/ui/BigButton';
import { MicButton } from '@/components/voice/MicButton';
import { displayAnswer, formatWon } from '@/lib/format';
import { normalizeDistrict, questionText, SEOUL_DISTRICTS, validateAnswer, visibleFields } from '@/lib/rules/form';
import type { Answer, AnswerMap, AnswerValue, ExtractResult, FormField, HelperMode } from '@/lib/types';

export interface FormModeTemplate {
  imageSrc: string;
  imageAlt: string;
  slots: readonly FormSlot[];
  page?: number;
  temporary?: boolean;
}

export interface FormModeProps {
  appId: string;
  helperMode: HelperMode;
  fields: FormField[];
  answers: AnswerMap;
  template?: FormModeTemplate;
  onSave: (answers: Answer[]) => Promise<void>;
}

export type FillMode = 'question' | 'form';

const draftImage = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#fffdf8"/>
<rect x="28" y="28" width="744" height="544" rx="16" fill="none" stroke="#1f1a17" stroke-width="4"/>
<text x="400" y="100" fill="#1f1a17" font-family="sans-serif" font-weight="bold" font-size="34" text-anchor="middle">임시 입력 양식</text>
<path d="M55 140h690M55 277h690M55 402h690M55 527h690" stroke="#a89a8d" stroke-width="2"/>
</svg>`;

const draftTemplate: FormModeTemplate = {
  imageSrc: 'data:image/svg+xml,' + encodeURIComponent(draftImage),
  imageAlt: '세 칸이 있는 연습용 양식',
  temporary: true,
  slots: [
    { id: 'draft-district', fieldKey: 'district', x: 8, y: 27, w: 84, h: 17, fontPt: 17 },
    { id: 'draft-dong', fieldKey: 'dong', x: 8, y: 48, w: 84, h: 17, fontPt: 17 },
    { id: 'draft-household', fieldKey: 'household_size', x: 8, y: 69, w: 84, h: 17, fontPt: 17 },
  ],
};

export function FormModeTabs({ mode, onChange }: { mode: FillMode; onChange: (mode: FillMode) => void }) {
  return (
    <div role="group" aria-label="신청서 채우는 방법" className="grid grid-cols-2 gap-3">
      <BigButton variant="choice" selected={mode === 'question'} onClick={() => onChange('question')}>질문에 답하기</BigButton>
      <BigButton variant="choice" selected={mode === 'form'} onClick={() => onChange('form')}>양식에 직접 적기</BigButton>
    </div>
  );
}

export function FormMode({ appId, helperMode, fields, answers, template = draftTemplate, onSave }: FormModeProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const availableFields = visibleFields(fields, answers);
  const field = availableFields.find(({ key }) => key === selectedKey);
  return (
    <section aria-label="양식에 직접 적기" className="grid gap-3">
      {template.temporary && <p className="rounded-xl border-2 border-line bg-primary-soft p-3 font-bold">연습용 양식이에요. 제출할 수 있는 공식 양식은 아직 준비 중이에요.</p>}
      <FormOverlay mode="input" {...template} fields={fields} answers={answers}
        selectedFieldKey={field?.key} onSelectField={setSelectedKey} />
      {field && <FieldEditor key={field.key} appId={appId} helperMode={helperMode} field={field}
        answer={answers[field.key]} onSave={onSave} />}
    </section>
  );
}

function parseInput(field: FormField, input: string): AnswerValue | null {
  const text = input.trim();
  if (!text) return null;
  if (text === 'unknown' && field.allowUnknown) return 'unknown';
  switch (field.type) {
    case 'yes_no': return text === 'true' ? true : text === 'false' ? false : null;
    case 'money':
    case 'count': {
      const digits = text.replace(/,/g, '');
      return /^\d+$/.test(digits) && Number.isSafeInteger(Number(digits)) ? Number(digits) : null;
    }
    case 'district': return normalizeDistrict(text);
    default: return text;
  }
}

function FieldEditor({ appId, helperMode, field, answer, onSave }: {
  appId: string;
  helperMode: HelperMode;
  field: FormField;
  answer?: Answer;
  onSave: FormModeProps['onSave'];
}) {
  const id = useId();
  const [input, setInput] = useState(() => answer && answer.value !== 'unknown' ? String(answer.value) : '');
  const [voice, setVoice] = useState<{ result: ExtractResult; utterance: string } | null>(null);
  const [approximate, setApproximate] = useState(answer?.isApproximate ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const options = field.type === 'yes_no' ? [{ value: 'true', label: '예' }, { value: 'false', label: '아니요' }]
    : field.type === 'district' ? SEOUL_DISTRICTS.map((value) => ({ value, label: value }))
    : field.type === 'choice' ? field.options ?? [] : null;

  function updateInput(value: string) {
    setInput(value);
    setVoice(null);
    setApproximate(false);
    setMessage('');
  }

  function onVoiceResult(result: ExtractResult, utterance: string) {
    if (saving) return;
    setVoice({ result, utterance });
    if (result.confidence !== 'high' || result.value === null || !validateAnswer(field, result.value)) {
      setMessage(result.clarifyQuestion || '다시 말하거나 값을 직접 적어 주세요.');
      return;
    }
    setInput(String(field.type === 'district' ? normalizeDistrict(String(result.value)) : result.value));
    setApproximate(result.isApproximate);
    setMessage('알아들은 값이 맞는지 확인하고 저장해 주세요.');
  }

  async function save(value: AnswerValue | null) {
    if (saving) return;
    if (value === null || !validateAnswer(field, value)) {
      setMessage('이 칸에 맞는 값을 다시 입력해 주세요.');
      return;
    }
    const voiceValue = voice?.result.value;
    const usedVoice = voice?.result.confidence === 'high' &&
      (field.type === 'district' && typeof voiceValue === 'string' ? normalizeDistrict(voiceValue) : voiceValue) === value;
    setSaving(true);
    try {
      await onSave([{ fieldKey: field.key, value, inputMethod: usedVoice ? 'voice' : value === 'unknown' ? 'unknown' : 'text',
        rawSpeech: usedVoice ? voice.utterance : null, isApproximate: typeof value === 'number' && approximate }]);
      if (value === 'unknown') {
        setInput('unknown');
        setApproximate(false);
      }
      setMessage('저장했어요.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  const controlClass = 'min-h-16 w-full rounded-xl border-[3px] border-line bg-white px-3 text-xl focus-visible:outline-2 focus-visible:outline-primary';
  const value = parseInput(field, input);
  return (
    <div className="grid gap-3 rounded-xl border-[3px] border-line bg-white p-3">
      <label htmlFor={id} className="text-xl font-bold">{questionText(field, helperMode)}</label>
      {field.helpEasy && <p id={`${id}-help`}>{field.helpEasy}</p>}
      {options ? (
        <select id={id} className={controlClass} value={input === 'unknown' ? '' : input} disabled={saving}
          aria-describedby={field.helpEasy ? `${id}-help` : undefined} onChange={(event) => updateInput(event.target.value)}>
          <option value="">골라 주세요</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input id={id} className={controlClass} value={input === 'unknown' ? '' : input} disabled={saving}
          inputMode={field.type === 'money' || field.type === 'count' ? 'numeric' : 'text'}
          aria-describedby={field.helpEasy ? `${id}-help` : undefined} onChange={(event) => updateInput(event.target.value)} />
      )}
      <MicButton appId={appId} helperMode={helperMode} field={field} otherFields={[]}
        clarify={voice?.result.clarifyQuestion && voice.result.clarifyOptions?.length
          ? { question: voice.result.clarifyQuestion, options: voice.result.clarifyOptions } : null}
        disabled={saving} onResult={onVoiceResult} />
      {field.type === 'money' && typeof value === 'number' && (
        <label className="flex min-h-16 items-center gap-3">
          <input type="checkbox" className="size-6" checked={approximate} disabled={saving}
            onChange={(event) => setApproximate(event.target.checked)} />
          대충은 알아요
        </label>
      )}
      {(approximate || value === 'unknown' || (value === null && answer?.value === 'unknown')) && (
        <p className="text-warn">
          {approximate && typeof value === 'number' && `말씀하신 금액: 약 ${formatWon(value)}, `}
          {field.checkGuide ? `${field.checkGuide} · ` : ''}확인 후 적기
        </p>
      )}
      {answer && <p className="text-base">저장된 답: {displayAnswer(field, answer)}</p>}
      {message && <p role="status">{message}</p>}
      <BigButton disabled={saving} onClick={() => void save(value)}>{saving ? '저장 중이에요' : '이 칸 저장하기'}</BigButton>
      {field.allowUnknown && <BigButton variant="secondary" disabled={saving} onClick={() => void save('unknown')}>잘 모르겠어요</BigButton>}
    </div>
  );
}
