type ExistingItem = {
  docName: string;
  dueDate: string | null;
  alsoRequested: boolean;
  isDone: boolean;
  supplementId: string | null;
};

type RequestedItem = {
  name: string;
  easyName: string;
  easyExplain: string;
  issuePlace: string;
  placeGroup: "home" | "onsite" | "bank" | "work" | "tax" | "gov24";
};

export type NewSupplementChecklistItem = {
  docName: string;
  easyExplain: string;
  issuePlace: string;
  placeGroup: RequestedItem["placeGroup"];
  source: "supplement";
  supplementId: string;
  dueDate: string | null;
  isDone: false;
  alsoRequested: false;
};

export function normalizeDocName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ")
    .replace(/최근\s*\d+\s*개월(?:간|분)?/g, " ")
    .replace(/본인\s*명의/g, " ")
    .replace(/각\s*1\s*부|1\s*부|사본|원본/g, " ")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .toLowerCase();
}

export function mergeSupplement<T extends ExistingItem>(
  existing: T[],
  items: RequestedItem[],
  deadline: string | null,
  sid: string,
): { updated: T[]; added: NewSupplementChecklistItem[]; matchedCount: number; addedCount: number } {
  const updated = existing.map((item) => ({ ...item }));
  const added: NewSupplementChecklistItem[] = [];
  let matchedCount = 0;

  for (const item of items) {
    const name = normalizeDocName(item.name);
    if (!name) continue;
    const match = updated.find((candidate) => normalizeDocName(candidate.docName) === name);
    if (match) {
      match.dueDate = deadline;
      match.alsoRequested = true;
      match.isDone = false;
      match.supplementId = sid;
      matchedCount += 1;
      continue;
    }
    // The same notice can list the same document twice. Keep one checklist row.
    if (added.some((candidate) => normalizeDocName(candidate.docName) === name)) continue;
    added.push({
      docName: item.name,
      easyExplain: `${item.easyName}. ${item.easyExplain}`,
      issuePlace: item.issuePlace,
      placeGroup: item.placeGroup,
      source: "supplement",
      supplementId: sid,
      dueDate: deadline,
      isDone: false,
      alsoRequested: false,
    });
  }

  return { updated, added, matchedCount, addedCount: added.length };
}
