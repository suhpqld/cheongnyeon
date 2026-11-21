'use client';

import type { CheckTask, DocumentRule } from '@/lib/rules/checklist';
import type { PrecheckRule } from '@/lib/types';

interface DiscoveryCardProps {
  newlyRequiredDocs: DocumentRule[];
  newChecks: CheckTask[];
  newPrechecks: PrecheckRule[];
  onContinue?: () => void;
}

export function DiscoveryCard({ newlyRequiredDocs, newChecks, newPrechecks, onContinue }: DiscoveryCardProps) {
  const hasItems = newlyRequiredDocs.length > 0 || newChecks.length > 0 || newPrechecks.length > 0;
  if (!hasItems) return null;

  return <section className="grid gap-4 rounded-3xl border-4 border-orange-200 bg-white p-5 shadow-sm" aria-live="polite">
    <div className="flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-full bg-orange-100 text-2xl" aria-hidden="true">④</div>
      <div>
        <p className="text-sm font-bold text-orange-700">깨닫는 순간</p>
        <h2 className="text-2xl font-black">이번 답 때문에 준비할 것이 생겼어요</h2>
      </div>
    </div>
    {newlyRequiredDocs.length > 0 && <div className="grid gap-2 rounded-2xl bg-orange-50 p-4">
      <p className="font-bold">📋 이 답 때문에 챙길 서류가 생겼어요</p>
      {newlyRequiredDocs.map((doc) => <div key={doc.id} className="grid gap-1">
        <p className="text-xl font-bold">{doc.docName}</p>
        {doc.easyExplain && <p>{doc.easyExplain}</p>}
        {doc.issuePlace && <p className="text-sm text-slate-700">받는 곳: {doc.issuePlace}</p>}
      </div>)}
    </div>}
    {newChecks.length > 0 && <div className="grid gap-2 rounded-2xl bg-yellow-50 p-4">
      <p className="font-bold">⚠ 확인할 것이 생겼어요</p>
      {newChecks.map((check) => <div key={check.key} className="grid gap-1">
        <p className="text-xl font-bold">{check.label}</p>
        {check.checkGuide && <p>{check.checkGuide}</p>}
      </div>)}
    </div>}
    {newPrechecks.length > 0 && <div className="grid gap-2 rounded-2xl bg-blue-50 p-4">
      <p className="font-bold">💡 주민센터에서 자주 확인하는 항목이에요</p>
      {newPrechecks.map((precheck) => <div key={precheck.id} className="grid gap-1">
        <p className="text-xl font-bold">{precheck.checkQuestion}</p>
        <p>{precheck.whyEasy}</p>
      </div>)}
    </div>}
    {onContinue && <button type="button" className="min-h-16 rounded-2xl bg-orange-700 text-xl font-bold text-white" onClick={onContinue}>알겠어요, 다음 질문</button>}
  </section>;
}
