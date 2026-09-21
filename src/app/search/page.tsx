import { AppShell } from "@/components/app-shell";
import { retrieveAuthorizedDocuments } from "@/lib/ai/retrieval";
import { headers } from "next/headers";
import { SearchExperience } from "./search-experience";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "invoice";
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? undefined;
  const hits = query.trim()
    ? await retrieveAuthorizedDocuments(query, tenantSlug)
    : [];
  return (
    <AppShell
      title="Search"
      description="Only results you have permission to see are returned."
    >
      <SearchExperience initialQuery={query} initialHits={hits} />
    </AppShell>
  );
}
