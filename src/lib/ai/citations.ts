import type { AiCitation, SearchHit } from "@/lib/domain/types";
export function citationsForRetrieved(
  requestedIds: string[],
  retrieved: SearchHit[],
): AiCitation[] {
  const allowed = new Map(retrieved.map((item) => [item.id, item]));
  return [...new Set(requestedIds)].flatMap((id) => {
    const hit = allowed.get(id);
    return hit
      ? [{ searchDocumentId: hit.id, label: hit.title, href: hit.href }]
      : [];
  });
}
