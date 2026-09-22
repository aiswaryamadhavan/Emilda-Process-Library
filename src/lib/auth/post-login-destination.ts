import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  tenantPortalPathWithSuffix,
  tenantSlugPattern,
} from "@/lib/tenant";

const tenantScopedPaths = ["/processes", "/governance"] as const;

function parseAcceptedTenantSlugs(value: unknown): string[] {
  let items = value;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const slug = (item as { slug?: unknown }).slug;
      return typeof slug === "string" && tenantSlugPattern.test(slug)
        ? slug
        : null;
    })
    .filter((slug): slug is string => Boolean(slug));
}

async function loadPrimaryMembershipSlug(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("tenant_memberships")
    .select("tenants(slug)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .limit(1);

  const row = data?.[0];
  if (!row || typeof row !== "object") return null;
  const tenants = (row as { tenants?: { slug?: string } | { slug?: string }[] })
    .tenants;
  const tenant = Array.isArray(tenants) ? tenants[0] : tenants;
  const slug = tenant?.slug;
  return slug && tenantSlugPattern.test(slug) ? slug : null;
}

function isTenantScopedAppPath(path: string) {
  return tenantScopedPaths.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export async function resolvePostLoginDestination(input: {
  safeNext: string;
  platformAdmin: boolean;
  acceptedTenants: unknown;
  supabase: SupabaseClient;
  userId: string;
  requestHost: string | null;
  rootDomain?: string;
  tenantPathHost?: string;
}) {
  const {
    safeNext,
    platformAdmin,
    acceptedTenants,
    supabase,
    userId,
    requestHost,
    rootDomain,
    tenantPathHost,
  } = input;

  const acceptedSlugs = parseAcceptedTenantSlugs(acceptedTenants);
  const membershipSlug =
    acceptedSlugs[0] ?? (await loadPrimaryMembershipSlug(supabase, userId));

  const portalSuffix = (suffix: string) =>
    membershipSlug
      ? tenantPortalPathWithSuffix(
          membershipSlug,
          suffix,
          requestHost,
          rootDomain,
          tenantPathHost,
        )
      : null;

  if (membershipSlug && (safeNext === "/" || isTenantScopedAppPath(safeNext))) {
    const suffix = safeNext === "/" ? "/processes" : safeNext;
    return portalSuffix(suffix) ?? safeNext;
  }

  if (safeNext === "/") {
    if (platformAdmin) return "/admin/tenants";
    if (membershipSlug) {
      return portalSuffix("/processes") ?? "/processes";
    }
    return "/processes";
  }

  if (safeNext.startsWith("/admin")) return safeNext;

  return safeNext;
}
