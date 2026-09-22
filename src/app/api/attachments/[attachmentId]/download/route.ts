import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin)
    return Response.json(
      { error: "Evidence storage is not configured." },
      { status: 503 },
    );
  const tenantSlug = (await headers()).get("x-tenant-slug");
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug ?? "")
    .maybeSingle();
  if (!tenant)
    return Response.json({ error: "File not found." }, { status: 404 });
  const { data: file } = await admin
    .from("attachments")
    .select("bucket,object_path,filename,process_id")
    .eq("tenant_id", tenant.id)
    .eq("id", attachmentId)
    .eq("status", "AVAILABLE")
    .maybeSingle();
  if (!file)
    return Response.json({ error: "File not found." }, { status: 404 });
  if (!file.process_id)
    return Response.json({ error: "File not found." }, { status: 404 });
  const { data: process } = await supabase
    .from("processes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("id", file.process_id)
    .maybeSingle();
  if (!process)
    return Response.json({ error: "File not found." }, { status: 404 });
  const { data, error } = await admin.storage
    .from(file.bucket)
    .createSignedUrl(
      file.object_path,
      60,
      new URL(request.url).searchParams.get("inline") === "1"
        ? undefined
        : { download: file.filename },
    );
  if (error || !data)
    return Response.json(
      { error: "File is temporarily unavailable. Try again." },
      { status: 503 },
    );
  return Response.redirect(data.signedUrl, 302);
}
