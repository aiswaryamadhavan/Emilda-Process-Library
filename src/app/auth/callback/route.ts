import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantPortalPath } from "@/lib/tenant";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  if (!code)
    return NextResponse.redirect(
      new URL("/auth/error?reason=missing_code", request.url),
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return NextResponse.redirect(
      new URL("/auth/error?reason=not_configured", request.url),
    );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(
      new URL("/auth/error?reason=exchange_failed", request.url),
    );

  const { data: acceptedTenants } = await supabase.rpc(
    "accept_my_tenant_invitations",
  );
  const { data: platformAdmin } = await supabase.rpc("is_platform_admin");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const firstTenant = Array.isArray(acceptedTenants)
    ? acceptedTenants[0]
    : null;
  const requestHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const destination =
    safeNext === "/" && platformAdmin
      ? "/admin/tenants"
      : safeNext === "/" && firstTenant?.slug
        ? tenantPortalPath(
            firstTenant.slug,
            requestHost,
            process.env.ROOT_DOMAIN,
            process.env.TENANT_PATH_HOST,
          )
        : safeNext;

  return NextResponse.redirect(new URL(destination, request.url));
}
