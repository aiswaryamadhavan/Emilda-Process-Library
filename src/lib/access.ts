import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const processIds: Record<string, string> = {
  "weekly-scorecard": "50000000-0000-4000-8000-000000000001",
  "purchase-approval": "50000000-0000-4000-8000-000000000002",
  "dispatch-confirmation": "50000000-0000-4000-8000-000000000003",
  "service-handoff": "50000000-0000-4000-8000-000000000004",
};
const auditIds: Record<string, string> = {
  "scorecard-week-38": "80000000-0000-4000-8000-000000000002",
};
const approvalIds: Record<string, string> = {
  "purchase-v21": "c0000000-0000-4000-8000-000000000001",
};
const issueIds: Record<string, string> = {
  "invoice-delay": "90000000-0000-4000-8000-000000000001",
};
const changeIds: Record<string, string> = {
  "delegated-approval": "a0000000-0000-4000-8000-000000000001",
};
async function tenantId() {
  const values = await headers();
  const forwarded = values.get("x-tenant-id");
  if (forwarded) return forwarded;
  const slug = values.get("x-tenant-slug");
  if (!slug) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}
export async function requireProcessAccess(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const id = processIds[slug] ?? slug;
  const tenant = await tenantId();
  if (!tenant) notFound();
  const { data } = await supabase
    .from("processes")
    .select("id")
    .eq("tenant_id", tenant)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
}
export async function canDesignProcess(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return true;
  const id = processIds[slug] ?? slug;
  const { data } = await supabase.rpc("can_design_process_action", {
    p_process_id: id,
  });
  return data === true;
}
async function requireScoped(table: string, id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const tenant = await tenantId();
  if (!tenant) notFound();
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("tenant_id", tenant)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
}
export const requireAuditAccess = (slug: string) =>
  requireScoped("audits", auditIds[slug] ?? slug);
export const requireApprovalAccess = (slug: string) =>
  requireScoped("approvals", approvalIds[slug] ?? slug);
export const requireIssueAccess = (slug: string) =>
  requireScoped("issues", issueIds[slug] ?? slug);
export const requireChangeAccess = (slug: string) =>
  requireScoped("change_requests", changeIds[slug] ?? slug);
export async function canAccessRelease(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return true;
  const tenant = await tenantId();
  if (!tenant) return false;
  const versionId =
    slug === "purchase-v21" ? "60000000-0000-4000-8000-000000000003" : slug;
  const { data } = await supabase
    .from("process_releases")
    .select("id")
    .eq("tenant_id", tenant)
    .eq("version_id", versionId)
    .maybeSingle();
  return Boolean(data);
}
