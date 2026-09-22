import "server-only";

import { headers } from "next/headers";

import { resolveTenantRoute } from "@/lib/tenant";

export async function resolveDemoTenantSlug() {
  const requestHeaders = await headers();
  const fromHeader = requestHeaders.get("x-tenant-slug");
  if (fromHeader) return fromHeader;

  const referer = requestHeaders.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return (
        resolveTenantRoute(
          url.host,
          url.pathname,
          process.env.ROOT_DOMAIN,
          process.env.TENANT_PATH_HOST,
        )?.slug ?? "acme"
      );
    } catch {
      return "acme";
    }
  }

  return "acme";
}

export function demoTenantId(slug: string) {
  return `demo:${slug}`;
}
