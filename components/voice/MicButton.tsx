import type { FC } from 'react';
import type { AnswerValue, ExtractResult, FormField, HelperMode } from '@/lib/types';
import { BigButton } from '@/components/ui/BigButton';

export interface MicButtonProps {
  appId: string;
  helperMode: HelperMode;
  field: FormField;
  otherFields: FormField[];
  clarify: { question: string; options: { label: string; value: AnswerValue }[] } | null;
  onResult: (result: ExtractResult, utterance: string) => void;
  onUnavailable?: (reason: 'unsupported' | 'denied' | 'limit') => void;
  disabled?: boolean;
}

export const MicButton: FC<MicButtonProps> = () => {
  return <BigButton variant="secondary" icon="🎤" disabled>말하기 (준비 중)</BigButton>;
};

export default MicButton;
