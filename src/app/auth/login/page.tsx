import { ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { headers } from "next/headers";

import { EMILDA_PROCESS_LIBRARY } from "@/lib/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantPortalPath } from "@/lib/tenant";
import { AuthLogin } from "./auth-login";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const explicitTenantSlug = requestHeaders.get("x-tenant-slug");
  const tenantPathPrefix = requestHeaders.get("x-tenant-path-prefix") ?? "";
  const requestHost = requestHeaders.get("host");
  const { next } = await searchParams;
  const fallbackDestination = explicitTenantSlug
    ? tenantPortalPath(
        explicitTenantSlug,
        requestHost,
        process.env.ROOT_DOMAIN,
        process.env.TENANT_PATH_HOST,
      )
    : tenantPathPrefix
      ? `${tenantPathPrefix}/processes`
      : "/processes";
  const defaultDestination =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : fallbackDestination;
  const tenantSlug = explicitTenantSlug ?? (supabase ? "" : "acme");
  let tenant = {
    name: EMILDA_PROCESS_LIBRARY,
    primary: "#1f6d62",
    accent: "#74d1bf",
  };
  if (supabase && tenantSlug) {
    const { data } = await supabase
      .rpc("get_tenant_login_branding", { p_slug: tenantSlug })
      .maybeSingle();
    if (data) {
      const branding = data as {
        tenant_name: string;
        primary_color: string;
        accent_color: string;
      };
      tenant = {
        name: EMILDA_PROCESS_LIBRARY,
        primary: branding.primary_color,
        accent: branding.accent_color,
      };
    }
  }
  const style = {
    "--brand-primary": tenant.primary,
    "--brand-accent": tenant.accent,
    "--primary": tenant.primary,
  } as CSSProperties;

  return (
    <main
      className="grid min-h-dvh place-items-center bg-[var(--surface-subtle)] p-4"
      style={style}
    >
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-[0_20px_70px_rgba(23,50,77,.12)] sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--navy)] text-xl font-semibold text-white">
          E
        </span>
        <p className="eyebrow mt-8">{tenant.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--navy)]">
          {tenantSlug ? "Welcome to your process portal" : "Sign in to Emilda"}
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          {tenantSlug
            ? "See what needs attention and keep agreed processes working."
            : "Create clients, give people access, and govern every important process from one calm workspace."}
        </p>
        <AuthLogin
          defaultDestination={defaultDestination}
          demoMode={!supabase}
        />
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          Your tenant and permissions are checked on every request.
        </div>
      </div>
    </main>
  );
}
