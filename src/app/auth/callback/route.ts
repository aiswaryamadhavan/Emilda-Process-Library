import { NextResponse, type NextRequest } from "next/server";
import { isAllowedLoginEmail } from "@/lib/allowed-users";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedLoginEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/auth/error?reason=not_allowed", request.url),
    );
  }

  const { data: acceptedTenants } = await supabase.rpc(
    "accept_my_tenant_invitations",
  );
  const { data: platformAdmin } = await supabase.rpc("is_platform_admin");
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/processes";
  const requestHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const destination = await resolvePostLoginDestination({
    safeNext,
    platformAdmin: platformAdmin === true,
    acceptedTenants,
    supabase,
    userId: user.id,
    requestHost,
    rootDomain: process.env.ROOT_DOMAIN,
    tenantPathHost: process.env.TENANT_PATH_HOST,
  });

  return NextResponse.redirect(new URL(destination, request.url));
}
