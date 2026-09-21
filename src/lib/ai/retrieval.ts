import "server-only";
import { searchHits } from "@/lib/demo-data";
import type { SearchHit } from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function retrieveAuthorizedDocuments(
  query: string,
  tenantSlug?: string,
): Promise<SearchHit[]> {
  const supabase = await createSupabaseServerClient();
  if (supabase && tenantSlug) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (!tenant) return [];
    const { data } = await supabase
      .from("search_documents")
      .select("id, source_type, title, content, href, process_id")
      .eq("tenant_id", tenant.id)
      .textSearch("search_vector", query, {
        type: "websearch",
        config: "english",
      })
      .limit(8);
    return (data ?? []).map((row) => ({
      id: row.id,
      type: normalizeType(row.source_type),
      title: row.title,
      excerpt: row.content.slice(0, 280),
      href: row.href,
      processId: row.process_id ?? undefined,
    }));
  }
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return searchHits
    .filter((hit) =>
      terms.some((term) =>
        `${hit.title} ${hit.excerpt}`.toLowerCase().includes(term),
      ),
    )
    .slice(0, 8);
}

function normalizeType(value: string): SearchHit["type"] {
  return value === "STEP"
    ? "Step"
    : value === "ISSUE"
      ? "Issue"
      : value === "GOVERNANCE_NOTE"
        ? "Governance Note"
        : value === "VERSION"
          ? "Version"
          : value === "ATTACHMENT"
            ? "Attachment"
            : "Process";
}
