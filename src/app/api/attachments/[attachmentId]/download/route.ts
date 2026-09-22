import { headers } from "next/headers";
import { readDemoAttachment } from "@/lib/demo-process-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveTenantRoute } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  if (!supabase || !admin) {
    const html = await readDemoAttachment(attachmentId);
    if (!html) {
      return Response.json({ error: "File not found." }, { status: 404 });
    }
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": inline
          ? "inline"
          : `attachment; filename="${attachmentId}.html"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const requestHeaders = await headers();
  const proxyTenantId = requestHeaders.get("x-tenant-id");
  let tenant =
    proxyTenantId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      proxyTenantId,
    )
      ? { id: proxyTenantId }
      : null;
  if (!tenant) {
    const requestUrl = new URL(request.url);
    const tenantSlug =
      requestHeaders.get("x-tenant-slug") ??
      resolveTenantRoute(
        requestUrl.host,
        requestUrl.pathname,
        globalThis.process.env.ROOT_DOMAIN,
        globalThis.process.env.TENANT_PATH_HOST,
      )?.slug;
    const { data } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug ?? "")
      .maybeSingle();
    tenant = data;
  }
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
  const { data: processRecord } = await supabase
    .from("processes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("id", file.process_id)
    .maybeSingle();
  if (!processRecord)
    return Response.json({ error: "File not found." }, { status: 404 });
  const { data, error } = await admin.storage
    .from(file.bucket)
    .createSignedUrl(
      file.object_path,
      60,
      inline ? undefined : { download: file.filename },
    );
  if (error || !data)
    return Response.json(
      { error: "File is temporarily unavailable. Try again." },
      { status: 503 },
    );
  return Response.redirect(data.signedUrl, 302);
}
