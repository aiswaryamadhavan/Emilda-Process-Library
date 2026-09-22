import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  const tenantPrefix = request.headers.get("x-tenant-path-prefix") ?? "";
  return NextResponse.redirect(
    new URL(`${tenantPrefix}/auth/login`, request.url),
    303,
  );
}
