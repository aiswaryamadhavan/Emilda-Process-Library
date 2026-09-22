import { NextResponse, type NextRequest } from "next/server";
import { DEMO_USER_COOKIE } from "@/lib/allowed-users";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  const tenantPrefix = request.headers.get("x-tenant-path-prefix") ?? "";
  const response = NextResponse.redirect(
    new URL(`${tenantPrefix}/auth/login`, request.url),
    303,
  );
  response.cookies.delete(DEMO_USER_COOKIE);
  return response;
}
