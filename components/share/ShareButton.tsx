import type { FC } from 'react';
import { BigButton } from '@/components/ui/BigButton';

export const ShareButton: FC<{ appId: string }> = () => {
  return <BigButton variant="secondary" icon="👨‍👩‍👧" disabled>가족에게 보내기 (준비 중)</BigButton>;
};

export default ShareButton;
