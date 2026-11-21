import type { ChecklistItem, SupplementItem } from '@/lib/types';
import { normalizeDocName } from '@/lib/rules/supplement';
import { OriginalQuote } from './OriginalQuote';

export function ExtraItem({ item, checklist }: { item: SupplementItem; checklist: ChecklistItem[] }) {
  const matched = checklist.find(row => normalizeDocName(row.docName) === normalizeDocName(item.name));
  return <article className="grid gap-3 rounded-xl border-2 border-line bg-white p-4">
    <h3 className="text-[22px] font-bold">{item.easyName}</h3>
    <p>{item.easyExplain}</p>
    <p>📍 {item.issuePlace}</p>
    <OriginalQuote>{item.originalText}</OriginalQuote>
    {matched?.alsoRequested && <p className="rounded-lg bg-primary-soft p-2 font-bold">이미 준비 카드에 있던 서류예요. 다시 챙겨 주세요.</p>}
  </article>;
}
