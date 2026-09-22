const reserved = new Set(["www", "admin", "auth", "api"]);
export const tenantSlugPattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export type TenantRoute = {
  slug: string;
  pathPrefix: string;
  canonicalPath: string;
  source: "development-path" | "portal-path" | "subdomain";
};

export type TenantShellContext = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  primaryColor: string;
  accentColor: string;
  viewerName: string;
  viewerRole: string;
  supportReason: string | null;
  supportExpiresAt: string | null;
};

export function parseTenantShellContext(
  value: unknown,
): TenantShellContext | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const required = [
    "tenantId",
    "tenantName",
    "tenantSlug",
    "primaryColor",
    "accentColor",
    "viewerName",
    "viewerRole",
  ] as const;
  if (required.some((key) => typeof item[key] !== "string")) return null;
  if (
    !tenantSlugPattern.test(String(item.tenantSlug)) ||
    !/^#[0-9a-f]{6}$/i.test(String(item.primaryColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(item.accentColor))
  )
    return null;
  return {
    tenantId: String(item.tenantId),
    tenantName: String(item.tenantName),
    tenantSlug: String(item.tenantSlug),
    primaryColor: String(item.primaryColor),
    accentColor: String(item.accentColor),
    viewerName: String(item.viewerName),
    viewerRole: String(item.viewerRole),
    supportReason:
      typeof item.supportReason === "string" ? item.supportReason : null,
    supportExpiresAt:
      typeof item.supportExpiresAt === "string" ? item.supportExpiresAt : null,
  };
}

export function encodeTenantShellContext(context: TenantShellContext) {
  return encodeURIComponent(JSON.stringify(context));
}

export function decodeTenantShellContext(value: string | null) {
  if (!value) return null;
  try {
    return parseTenantShellContext(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

function normalizeHostname(value: string | null | undefined) {
  if (!value) return "";
  return value
    .split(",")[0]
    .trim()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
}

function validTenantSlug(value: string) {
  return tenantSlugPattern.test(value) && !reserved.has(value);
}

function stripExactPrefix(pathname: string, prefix: string) {
  if (!prefix) return pathname;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`))
    return pathname;
  return pathname.slice(prefix.length) || "/";
}

export function resolveTenantRoute(
  host: string | null,
  pathname: string,
  rootDomain = "emildaos.com",
  tenantPathHost = "gov.emilda.co",
): TenantRoute | null {
  const pathMatch = /^\/t\/([^/]+)(?:\/|$)/.exec(pathname);
  if (pathMatch) {
    if (!validTenantSlug(pathMatch[1])) return null;
    const pathPrefix = `/t/${pathMatch[1]}`;
    return {
      slug: pathMatch[1],
      pathPrefix,
      canonicalPath: stripExactPrefix(pathname, pathPrefix),
      source: "development-path",
    };
  }

  const hostname = normalizeHostname(host);
  if (!hostname) return null;
  const normalizedPathHost = normalizeHostname(tenantPathHost);
  if (normalizedPathHost && hostname === normalizedPathHost) {
    const tenantPathMatch = /^\/([^/]+)(?:\/|$)/.exec(pathname);
    if (!tenantPathMatch || !validTenantSlug(tenantPathMatch[1])) return null;
    const pathPrefix = `/${tenantPathMatch[1]}`;
    return {
      slug: tenantPathMatch[1],
      pathPrefix,
      canonicalPath: stripExactPrefix(pathname, pathPrefix),
      source: "portal-path",
    };
  }

  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  )
    return null;
  if (!hostname.endsWith(`.${rootDomain}`)) return null;
  const slug = hostname.slice(0, -(rootDomain.length + 1));
  return validTenantSlug(slug)
    ? {
        slug,
        pathPrefix: "",
        canonicalPath: pathname,
        source: "subdomain",
      }
    : null;
}

export function resolveTenantSlug(
  host: string | null,
  pathname: string,
  rootDomain = "emildaos.com",
  tenantPathHost = "gov.emilda.co",
): string | null {
  return (
    resolveTenantRoute(host, pathname, rootDomain, tenantPathHost)?.slug ?? null
  );
}

export function tenantPortalPath(
  slug: string,
  host: string | null,
  rootDomain = "emildaos.com",
  tenantPathHost = "gov.emilda.co",
) {
  if (!validTenantSlug(slug)) return "/";
  const hostname = normalizeHostname(host);
  if (hostname === normalizeHostname(tenantPathHost)) return `/${slug}/`;
  if (hostname === `${slug}.${rootDomain}`) return "/";
  return `/t/${slug}/`;
}

export function tenantPortalPathWithSuffix(
  slug: string,
  suffixPath: string,
  host: string | null,
  rootDomain = "emildaos.com",
  tenantPathHost = "gov.emilda.co",
) {
  const base = tenantPortalPath(slug, host, rootDomain, tenantPathHost);
  const suffix =
    suffixPath.startsWith("/") || suffixPath === ""
      ? suffixPath || "/"
      : `/${suffixPath}`;
  if (suffix === "/") return base;
  if (base === "/") return suffix;
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${baseTrimmed}${suffix}`;
}

/** Prefix for Process/Governance links on platform admin pages (requires DEFAULT_TENANT_SLUG). */
export function platformNavPrefix(
  host: string | null,
  defaultTenantSlug: string | undefined,
  rootDomain = "emildaos.com",
  tenantPathHost = "gov.emilda.co",
) {
  if (!defaultTenantSlug || !validTenantSlug(defaultTenantSlug)) return "";
  const base = tenantPortalPath(
    defaultTenantSlug,
    host,
    rootDomain,
    tenantPathHost,
  );
  if (base === "/") return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function stripTenantPathPrefix(pathname: string, pathPrefix: string) {
  return stripExactPrefix(pathname, pathPrefix);
}

export function stripLocalTenantPrefix(pathname: string): string {
  return (
    pathname.replace(/^\/t\/[a-z0-9][a-z0-9-]{1,61}[a-z0-9](?=\/|$)/, "") || "/"
  );
}
