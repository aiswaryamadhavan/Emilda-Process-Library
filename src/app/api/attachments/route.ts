import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const metadataSchema = z.object({
  processId: z.string().uuid(),
  entityType: z.enum([
    "PROCESS",
    "VERSION",
    "STEP",
    "AUDIT",
    "ISSUE",
    "CHANGE_REQUEST",
  ]),
  entityId: z.string().uuid(),
});
const allowed = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

function signatureMatches(mime: string, bytes: Uint8Array) {
  const prefix = Buffer.from(bytes.slice(0, 12));
  if (mime === "image/jpeg")
    return prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
  if (mime === "image/png")
    return prefix
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp")
    return (
      prefix.subarray(0, 4).toString() === "RIFF" &&
      prefix.subarray(8, 12).toString() === "WEBP"
    );
  if (mime === "application/pdf")
    return prefix.subarray(0, 4).toString() === "%PDF";
  if (mime.includes("officedocument"))
    return prefix[0] === 0x50 && prefix[1] === 0x4b;
  return !prefix.includes(0);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const value = form.get("file");
  const file =
    typeof value === "string" || value === null ? null : (value as File);
  const parsed = metadataSchema.safeParse({
    processId: form.get("processId"),
    entityType: form.get("entityType"),
    entityId: form.get("entityId"),
  });
  if (!file || typeof file.arrayBuffer !== "function" || !parsed.success)
    return Response.json(
      { error: "Choose a file and a valid attachment target." },
      { status: 400 },
    );
  if (file.size < 1 || file.size > 25 * 1024 * 1024 || !allowed.has(file.type))
    return Response.json(
      {
        error:
          "Use JPEG, PNG, WebP, PDF, DOCX, XLSX, CSV, or text up to 25 MB.",
      },
      { status: 415 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(file.type, bytes))
    return Response.json(
      { error: "The file contents do not match its declared type." },
      { status: 415 },
    );
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin)
    return Response.json({
      id: `demo-${randomUUID()}`,
      filename: file.name,
      status: "AVAILABLE",
      demo: true,
    });

  const tenantSlug = (await headers()).get("x-tenant-slug");
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug ?? "")
    .maybeSingle();
  if (!tenant)
    return Response.json({ error: "Tenant not found." }, { status: 404 });
  const { data: process } = await supabase
    .from("processes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("id", parsed.data.processId)
    .maybeSingle();
  if (!process)
    return Response.json({ error: "Process not found." }, { status: 404 });
  if (
    parsed.data.entityType === "PROCESS" &&
    parsed.data.entityId !== process.id
  )
    return Response.json(
      { error: "Attachment target not found." },
      { status: 404 },
    );
  const targetTables = {
    VERSION: "process_versions",
    STEP: "process_nodes",
    AUDIT: "audits",
    ISSUE: "issues",
    CHANGE_REQUEST: "change_requests",
  } as const;
  if (parsed.data.entityType !== "PROCESS") {
    const { data: target } = await supabase
      .from(targetTables[parsed.data.entityType])
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("process_id", process.id)
      .eq("id", parsed.data.entityId)
      .maybeSingle();
    if (!target)
      return Response.json(
        { error: "Attachment target not found." },
        { status: 404 },
      );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to upload evidence." },
      { status: 401 },
    );

  const attachmentId = randomUUID();
  const path = `${tenant.id}/quarantine/${attachmentId}/${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const { error: uploadError } = await admin.storage
    .from("evidence")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError)
    return Response.json(
      { error: "Upload did not finish. Try again." },
      { status: 500 },
    );
  const { error: recordError } = await admin.from("attachments").insert({
    id: attachmentId,
    tenant_id: tenant.id,
    process_id: process.id,
    uploader_id: user.id,
    bucket: "evidence",
    object_path: path,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    status: "AVAILABLE",
  });
  if (recordError) {
    await admin.storage.from("evidence").remove([path]);
    return Response.json(
      { error: "Evidence could not be recorded." },
      { status: 500 },
    );
  }
  const link =
    parsed.data.entityType === "AUDIT"
      ? admin.from("audit_attachments").insert({
          tenant_id: tenant.id,
          process_id: process.id,
          attachment_id: attachmentId,
          audit_id: parsed.data.entityId,
        })
      : parsed.data.entityType === "ISSUE"
        ? admin.from("issue_attachments").insert({
            tenant_id: tenant.id,
            process_id: process.id,
            attachment_id: attachmentId,
            issue_id: parsed.data.entityId,
          })
        : parsed.data.entityType === "CHANGE_REQUEST"
          ? admin.from("change_request_attachments").insert({
              tenant_id: tenant.id,
              process_id: process.id,
              attachment_id: attachmentId,
              change_request_id: parsed.data.entityId,
            })
          : admin.from("process_attachments").insert({
              tenant_id: tenant.id,
              process_id: process.id,
              attachment_id: attachmentId,
              version_id:
                parsed.data.entityType === "VERSION"
                  ? parsed.data.entityId
                  : null,
              node_id:
                parsed.data.entityType === "STEP" ? parsed.data.entityId : null,
            });
  const { error: linkError } = await link;
  if (linkError) {
    await admin.from("attachments").delete().eq("id", attachmentId);
    await admin.storage.from("evidence").remove([path]);
    return Response.json(
      { error: "Evidence could not be linked to this record." },
      { status: 500 },
    );
  }
  return Response.json({
    id: attachmentId,
    filename: file.name,
    status: "AVAILABLE",
  });
}
