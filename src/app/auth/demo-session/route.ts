import { NextResponse, type NextRequest } from "next/server";

import { DEMO_USER_COOKIE, findAllowedUser } from "@/lib/allowed-users";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const user = findAllowedUser(String(form.get("email") ?? ""));
  const nextValue = String(form.get("next") ?? "/processes");
  const next =
    nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : "/processes";
  const tenantPrefix = request.headers.get("x-tenant-path-prefix") ?? "";
  if (!user) {
    return NextResponse.redirect(
      new URL(`${tenantPrefix}/auth/error?reason=not_allowed`, request.url),
      303,
    );
  }
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(DEMO_USER_COOKIE, user.email, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
