import type { AppStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/constants';

export interface StageTrackerProps {
  status: AppStatus;
  docsReady: boolean;
  submittedAt: string | null;
  supplementDday: number | null;
  compact?: boolean;
}

export function StageTracker({ status }: StageTrackerProps) {
  return <p>{STATUS_LABEL[status]}</p>;
}

export default StageTracker;
