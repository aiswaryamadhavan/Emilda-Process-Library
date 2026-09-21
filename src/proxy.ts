import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  createTenantContextCookie,
  readTenantContextCookie,
  tenantContextCookieName,
} from "@/lib/tenant-context-cache";
import {
  encodeTenantShellContext,
  parseTenantShellContext,
  resolveTenantRoute,
} from "@/lib/tenant";

type CookieUpdate = {
  name: string;
  value: string;
  options: CookieOptions;
};

function routeResponse(
  request: NextRequest,
  requestHeaders: Headers,
  canonicalPath: string,
) {
  if (canonicalPath !== request.nextUrl.pathname) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function applyCookies(response: NextResponse, cookies: CookieUpdate[]) {
  cookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const tenantRoute = resolveTenantRoute(
    requestHost,
    request.nextUrl.pathname,
    process.env.ROOT_DOMAIN,
    process.env.TENANT_PATH_HOST,
  );
  const slug = tenantRoute?.slug ?? null;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-tenant-id");
  requestHeaders.delete("x-tenant-shell-context");
  requestHeaders.delete("x-tenant-path-prefix");
  const canonicalPath = tenantRoute?.canonicalPath ?? request.nextUrl.pathname;
  if (slug) requestHeaders.set("x-tenant-slug", slug);
  if (tenantRoute?.pathPrefix)
    requestHeaders.set("x-tenant-path-prefix", tenantRoute.pathPrefix);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const contextSecret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const cookieUpdates: CookieUpdate[] = [];
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          cookieUpdates.push(...items);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    const publicPath =
      canonicalPath.startsWith("/auth/") ||
      canonicalPath === "/manifest.webmanifest";
    if (!data?.claims && !publicPath) {
      if (canonicalPath.startsWith("/api/"))
        return Response.json(
          { error: "Sign in to continue." },
          { status: 401 },
        );
      const login = request.nextUrl.clone();
      login.pathname = tenantRoute?.pathPrefix
        ? `${tenantRoute.pathPrefix}/auth/login`
        : "/auth/login";
      login.searchParams.set("next", request.nextUrl.pathname);
      return applyCookies(NextResponse.redirect(login), cookieUpdates);
    }
    if (data?.claims && slug) {
      const userId = String(data.claims.sub ?? "");
      let shellContext = readTenantContextCookie(
        request.cookies.get(tenantContextCookieName)?.value,
        userId,
        slug,
        contextSecret,
      );
      if (!shellContext) {
        const { data: shellData } = await supabase.rpc(
          "get_tenant_shell_context",
          { p_slug: slug },
        );
        shellContext = parseTenantShellContext(shellData);
        if (shellContext) {
          const signedContext = createTenantContextCookie(
            shellContext,
            userId,
            contextSecret,
            Date.now(),
            typeof data.claims.exp === "number" ? data.claims.exp : undefined,
          );
          if (signedContext) {
            cookieUpdates.push({
              name: tenantContextCookieName,
              value: signedContext.value,
              options: {
                httpOnly: true,
                sameSite: "lax",
                secure: request.nextUrl.protocol === "https:",
                path: "/",
                expires: new Date(signedContext.expiresAt),
              },
            });
          }
        }
      }
      if (!shellContext) {
        const missing = request.nextUrl.clone();
        missing.pathname = "/_not-found";
        return applyCookies(
          NextResponse.rewrite(missing, { status: 404 }),
          cookieUpdates,
        );
      }
      requestHeaders.set("x-tenant-id", shellContext.tenantId);
      requestHeaders.set(
        "x-tenant-shell-context",
        encodeTenantShellContext(shellContext),
      );
    }
  }
  const response = applyCookies(
    routeResponse(request, requestHeaders, canonicalPath),
    cookieUpdates,
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)",
  ],
};
