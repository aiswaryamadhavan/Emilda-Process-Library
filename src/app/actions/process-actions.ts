"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canCreateProcesses,
  DEMO_USER_COOKIE,
} from "@/lib/allowed-users";
import {
  createDemoProcessFromStarter,
  reviseDemoProcessFromStarter,
} from "@/lib/demo-process-store";
import { demoTenantId, resolveDemoTenantSlug } from "@/lib/demo-tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveTenantRoute, tenantPortalPath } from "@/lib/tenant";
import { processGraphSchema } from "@/lib/domain/types";
import { clientProfileSchema } from "@/lib/domain/client-profile";
import {
  processResourceLinkInputSchema,
  processStarterDraftSchema,
  processStarterInputSchema,
} from "@/lib/domain/process-starter";
const cloneSchema = z.object({
  processId: z.string().uuid(),
  changeReason: z.string().min(3).max(1000),
  kind: z.enum(["IMPROVEMENT", "REDESIGN"]),
});
export async function cloneProcessVersion(input: unknown) {
  const parsed = cloneSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Explain why this process is changing." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { data, error } = await supabase.rpc("clone_process_version", {
    p_process_id: parsed.data.processId,
    p_change_reason: parsed.data.changeReason,
    p_kind: parsed.data.kind,
  });
  return error
    ? { ok: false, error: "You do not have permission to create this version." }
    : { ok: true, versionId: data };
}
const approvalSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  acknowledgementText: z.string().max(1000).default(""),
  note: z.string().max(2000).optional(),
});
export async function respondToApproval(input: unknown) {
  const parsed = approvalSchema.safeParse(input);
  if (
    !parsed.success ||
    (parsed.data?.decision === "APPROVED" &&
      parsed.data.acknowledgementText.trim().length < 10)
  )
    return {
      ok: false,
      error: "Confirm that you reviewed this exact process version.",
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { error } = await supabase.rpc("respond_to_process_approval", {
    p_approval_id: parsed.data.approvalId,
    p_decision: parsed.data.decision,
    p_acknowledgement_text: parsed.data.acknowledgementText,
    p_note: parsed.data.note,
  });
  return error
    ? {
        ok: false,
        error: "This approval is no longer current or is not assigned to you.",
      }
    : { ok: true };
}

const auditItemSchema = z.object({
  itemId: z.string().uuid(),
  followed: z.enum(["YES", "PARTIALLY", "NO", "NOT_APPLICABLE"]),
  comment: z.string().max(3000).optional(),
});
export async function saveAuditItem(input: unknown) {
  const parsed = auditItemSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Choose a checkpoint result." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { error } = await supabase
    .from("audit_items")
    .update({
      followed: parsed.data.followed,
      comment: parsed.data.comment || null,
      saved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.itemId);
  return error
    ? {
        ok: false,
        error:
          "This checkpoint could not be saved. It may already be historical.",
      }
    : { ok: true };
}
export async function completeAudit(auditId: string) {
  if (!z.string().uuid().safeParse(auditId).success)
    return { ok: false, error: "Audit not found." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { data, error } = await supabase.rpc("complete_process_audit", {
    p_audit_id: auditId,
  });
  return error
    ? {
        ok: false,
        error: "Complete every checkpoint before finishing the audit.",
      }
    : { ok: true, health: data };
}

const changeRequestDecisionSchema = z.object({
  changeRequestId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(2000).optional(),
});

export async function respondToChangeRequest(input: unknown) {
  const parsed = changeRequestDecisionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Choose whether to approve this improvement." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { data, error } = await supabase.rpc("respond_to_change_request", {
    p_change_request_id: parsed.data.changeRequestId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note,
  });
  return error
    ? {
        ok: false,
        error:
          "This Change Request is no longer current or is not assigned to you.",
      }
    : { ok: true, versionId: data };
}

const tenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  google: z.boolean(),
  microsoft: z.boolean(),
  inviteEmail: z.string().email(),
  inviteRoles: z
    .array(
      z.enum([
        "TENANT_ADMIN",
        "PROCESS_GUARDIAN",
        "PROCESS_OWNER",
        "CONTRIBUTOR",
        "APPROVER",
        "VIEWER",
        "AUDITOR",
      ]),
    )
    .min(1),
  accessScope: z.enum(["EVERYONE", "RESTRICTED"]),
  firstProcess: z.string().min(2).max(160),
  firstProcessDepartment: z.string().trim().min(2).max(120),
  departments: z.array(z.string().trim().min(2).max(120)).min(1).max(30),
  profile: clientProfileSchema,
});
export async function provisionTenant(input: unknown) {
  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        "Check the company name, tenant URL, branding, and sign-in provider.",
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { data, error } = await supabase.rpc("provision_tenant_with_profile", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_primary: parsed.data.primary,
    p_accent: parsed.data.accent,
    p_google: true,
    p_microsoft: false,
    p_invite_email: parsed.data.inviteEmail,
    p_invite_roles: parsed.data.inviteRoles,
    p_access_scope: parsed.data.accessScope,
    p_first_process: parsed.data.firstProcess,
    p_first_process_department: parsed.data.firstProcessDepartment,
    p_profile: parsed.data.profile,
    p_departments: parsed.data.departments,
  });
  return error
    ? {
        ok: false,
        error:
          "This tenant URL is unavailable or you are not a platform administrator.",
      }
    : { ok: true, tenantId: data };
}

const platformTenantIdSchema = z.string().uuid();

export async function openPlatformTenant(formData: FormData) {
  const tenantId = platformTenantIdSchema.safeParse(formData.get("tenantId"));
  if (!tenantId.success) redirect("/admin/tenants?open=invalid");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/admin/tenants?open=unavailable");

  const { data, error } = await supabase.rpc("open_platform_tenant", {
    p_tenant_id: tenantId.data,
  });
  const result = z
    .object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/) })
    .safeParse(data);

  if (error || !result.success) redirect("/admin/tenants?open=forbidden");

  revalidatePath("/admin/tenants");
  const requestHeaders = await headers();
  redirect(
    tenantPortalPath(
      result.data.slug,
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
      process.env.ROOT_DOMAIN,
      process.env.TENANT_PATH_HOST,
    ),
  );
}

async function resolveCurrentTenant() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const tenantSlug = await resolveDemoTenantSlug();
    return {
      supabase: null,
      tenantId: demoTenantId(tenantSlug),
      tenantSlug,
      demo: true as const,
    };
  }
  const requestHeaders = await headers();
  const proxyTenantId = z
    .string()
    .uuid()
    .safeParse(requestHeaders.get("x-tenant-id"));
  if (proxyTenantId.success)
    return {
      supabase,
      tenantId: proxyTenantId.data,
      tenantSlug: requestHeaders.get("x-tenant-slug"),
      demo: false as const,
    };
  let tenantSlug = requestHeaders.get("x-tenant-slug");
  // Server Actions are posted by Next.js and do not always retain the proxy's
  // custom tenant header. The same-origin referrer still contains the tenant
  // path, so use it as a safe fallback for actions started within a portal.
  if (!tenantSlug) {
    const referer = requestHeaders.get("referer");
    if (referer) {
      try {
        const url = new URL(referer);
        tenantSlug =
          resolveTenantRoute(
            url.host,
            url.pathname,
            process.env.ROOT_DOMAIN,
            process.env.TENANT_PATH_HOST,
          )?.slug ?? null;
      } catch {
        tenantSlug = null;
      }
    }
  }
  if (!tenantSlug) return { supabase, tenantId: null, tenantSlug: null, demo: false as const };
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();
  return {
    supabase,
    tenantId: data?.id ?? null,
    tenantSlug,
    demo: false as const,
  };
}

const profileUpdateSchema = z.object({
  profile: clientProfileSchema,
  departments: z.array(z.string().trim().min(2).max(120)).min(1).max(30),
});

export async function updateTenantProfile(input: unknown) {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        "Check the client details, website, contact email, and departments.",
    };
  const { supabase, tenantId } = await resolveCurrentTenant();
  if (!supabase || !tenantId)
    return { ok: false, error: "Client portal could not be verified." };
  const { error } = await supabase.rpc("save_tenant_profile", {
    p_tenant_id: tenantId,
    p_profile: parsed.data.profile,
    p_departments: parsed.data.departments,
  });
  if (error)
    return {
      ok: false,
      error: "Only a Tenant Admin can amend the client profile.",
    };
  revalidatePath("/more/client-profile");
  return { ok: true };
}

const invitationRoleSchema = z.enum([
  "TENANT_ADMIN",
  "PROCESS_GUARDIAN",
  "PROCESS_OWNER",
  "CONTRIBUTOR",
  "APPROVER",
  "VIEWER",
  "AUDITOR",
]);

const tenantInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  roles: z.array(invitationRoleSchema).min(1),
});

export async function inviteTenantUser(input: unknown) {
  const parsed = tenantInvitationSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Enter a valid Google email and choose at least one role.",
    };
  const { supabase, tenantId } = await resolveCurrentTenant();
  if (!supabase || !tenantId)
    return { ok: false, error: "Client portal could not be verified." };
  const { data, error } = await supabase.rpc("invite_tenant_user", {
    p_tenant_id: tenantId,
    p_email: parsed.data.email,
    p_roles: parsed.data.roles,
  });
  if (error)
    return {
      ok: false,
      error: "Only a Tenant Admin can give this client access.",
    };
  revalidatePath("/more/users");
  return { ok: true, invitationId: String(data) };
}

const starterCreationSchema = z.object({
  input: processStarterInputSchema,
  draft: processStarterDraftSchema,
  guardianName: z.string().trim().min(2).max(120),
});

export async function createProcessFromStarter(input: unknown) {
  const parsed = starterCreationSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        "The starting draft is incomplete. Generate it again and review the result.",
    };
  const { supabase, tenantId, tenantSlug, demo } = await resolveCurrentTenant();
  if (!tenantId || !tenantSlug)
    return { ok: false, error: "Client portal could not be verified." };

  if (demo) {
    const userEmail = (await cookies()).get(DEMO_USER_COOKIE)?.value;
    if (!canCreateProcesses(userEmail)) {
      return {
        ok: false,
        error: "Only Aishwarya can create processes right now.",
      };
    }
    const created = await createDemoProcessFromStarter(
      tenantSlug,
      parsed.data.input,
      parsed.data.draft,
      parsed.data.guardianName,
    );
    revalidatePath("/processes");
    return { ok: true, ...created };
  }

  if (!supabase)
    return { ok: false, error: "Client portal could not be verified." };
  const { data, error } = await supabase.rpc("create_process_from_starter", {
    p_tenant_id: tenantId,
    p_department_name: parsed.data.input.department,
    p_payload: {
      ...parsed.data.input,
      draft: parsed.data.draft,
    },
  });
  if (error)
    return {
      ok: false,
      error:
        "You need Process Guardian or Tenant Admin access to create this draft.",
    };
  revalidatePath("/processes");
  return {
    ok: true,
    processId: String(data.processId),
    versionId: String(data.versionId),
    processKey: String(data.processKey),
  };
}

const starterRevisionSchema = starterCreationSchema.extend({
  processId: z.string().uuid(),
});

export async function reviseProcessFromStarter(input: unknown) {
  const parsed = starterRevisionSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        "The revision is incomplete. Review each step and try saving again.",
    };
  const { supabase, tenantId, tenantSlug, demo } = await resolveCurrentTenant();
  if (!tenantId || !tenantSlug)
    return { ok: false, error: "Client portal could not be verified." };

  const filteredInput = {
    ...parsed.data.input,
    resourceLinks: parsed.data.input.resourceLinks.filter(
      (link) => link.label.trim() && link.url.trim(),
    ),
  };

  if (demo) {
    const userEmail = (await cookies()).get(DEMO_USER_COOKIE)?.value;
    if (!canCreateProcesses(userEmail)) {
      return {
        ok: false,
        error: "Only Aishwarya can revise processes right now.",
      };
    }
    const revised = await reviseDemoProcessFromStarter(
      tenantSlug,
      parsed.data.processId,
      filteredInput,
      parsed.data.draft,
      parsed.data.guardianName,
    );
    if (!revised)
      return { ok: false, error: "This process could not be found." };
    revalidatePath("/processes");
    revalidatePath(`/processes/${parsed.data.processId}`);
    return { ok: true, ...revised };
  }

  if (!supabase)
    return { ok: false, error: "Client portal could not be verified." };

  const { data: processRow } = await supabase
    .from("processes")
    .select("id, current_active_version_id")
    .eq("id", parsed.data.processId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!processRow)
    return { ok: false, error: "This process could not be found." };

  const { data: currentVersion } = await supabase
    .from("process_versions")
    .select("id, status")
    .eq("process_id", parsed.data.processId)
    .order("major_version", { ascending: false })
    .order("minor_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let targetVersionId = currentVersion?.id ?? "";
  if (!targetVersionId)
    return { ok: false, error: "This process has no version to update." };

  if (currentVersion?.status === "ACTIVE") {
    const cloned = await cloneProcessVersion({
      processId: parsed.data.processId,
      changeReason: "Updated from Process Library",
      kind: "IMPROVEMENT",
    });
    if (!cloned.ok || !cloned.versionId)
      return {
        ok: false,
        error:
          cloned.error ??
          "You need Process Guardian access to create a new version.",
      };
    targetVersionId = cloned.versionId;
  }

  const { error: versionError } = await supabase
    .from("process_versions")
    .update({
      purpose: parsed.data.draft.purpose,
      business_problem: parsed.data.draft.businessProblem,
      goal: parsed.data.draft.goal,
      trigger_description: parsed.data.draft.trigger,
      current_state: filteredInput.problem || filteredInput.goal,
      future_state: filteredInput.output,
      change_reason: "Updated from Process Library",
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetVersionId)
    .eq("process_id", parsed.data.processId);

  if (versionError)
    return {
      ok: false,
      error: "This revision could not be saved. Check your access and try again.",
    };

  await supabase
    .from("processes")
    .update({ name: filteredInput.name.trim() })
    .eq("id", parsed.data.processId);

  const { error: graphError } = await supabase.rpc("save_process_graph", {
    p_process_id: parsed.data.processId,
    p_version_id: targetVersionId,
    p_graph: parsed.data.draft.graph,
  });
  if (graphError)
    return {
      ok: false,
      error: "The process map could not be saved for this version.",
    };

  revalidatePath("/processes");
  revalidatePath(`/processes/${parsed.data.processId}`);
  return {
    ok: true,
    processId: parsed.data.processId,
    versionId: targetVersionId,
    processKey: "",
  };
}

const deleteDraftProcessSchema = z.object({
  processId: z.string().uuid(),
});

export async function deleteDraftProcess(input: unknown) {
  const parsed = deleteDraftProcessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Process not found." };
  const { supabase } = await resolveCurrentTenant();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const { error } = await supabase.rpc("soft_delete_draft_process", {
    p_process_id: parsed.data.processId,
  });
  if (error)
    return {
      ok: false,
      error:
        "This process cannot be deleted. Only an unapproved draft without governance history can be deleted.",
    };

  revalidatePath("/processes");
  return { ok: true };
}

const resourceLinkMutationSchema = z.object({
  processId: z.string().uuid(),
  versionId: z.string().uuid(),
  resource: processResourceLinkInputSchema,
});

export async function addProcessResourceLink(input: unknown) {
  const parsed = resourceLinkMutationSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Give the link a name and use a complete http or https address.",
    };
  const { supabase, tenantId } = await resolveCurrentTenant();
  if (!supabase || !tenantId)
    return { ok: false, error: "Client portal could not be verified." };

  const { data, error } = await supabase.rpc("add_process_resource_link", {
    p_process_id: parsed.data.processId,
    p_version_id: parsed.data.versionId,
    p_label: parsed.data.resource.label,
    p_resource_type: parsed.data.resource.resourceType,
    p_url: parsed.data.resource.url,
    p_description: parsed.data.resource.description,
  });
  if (error)
    return {
      ok: false,
      error:
        "Only a Process Guardian or Tenant Admin can add links to an editable draft.",
    };
  revalidatePath(`/processes/${parsed.data.processId}`);
  return { ok: true, linkId: String(data) };
}

const removeResourceLinkSchema = z.object({
  processId: z.string().uuid(),
  linkId: z.string().uuid(),
});

export async function removeProcessResourceLink(input: unknown) {
  const parsed = removeResourceLinkSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "This process link could not be verified." };
  const { supabase, tenantId } = await resolveCurrentTenant();
  if (!supabase || !tenantId)
    return { ok: false, error: "Client portal could not be verified." };

  const { error } = await supabase.rpc("remove_process_resource_link", {
    p_link_id: parsed.data.linkId,
  });
  if (error)
    return {
      ok: false,
      error: "This link belongs to locked history or you cannot change it.",
    };
  revalidatePath(`/processes/${parsed.data.processId}`);
  return { ok: true };
}

const graphSaveSchema = z.object({
  processId: z.string(),
  versionId: z.string(),
  graph: processGraphSchema,
});
const demoProcessIds: Record<string, string> = {
  "purchase-approval": "50000000-0000-4000-8000-000000000002",
};
const demoVersionIds: Record<string, string> = {
  demo: "60000000-0000-4000-8000-000000000003",
};

export async function saveProcessGraph(input: unknown) {
  const parsed = graphSaveSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "The process map contains invalid steps or connections.",
    };
  const processId =
    demoProcessIds[parsed.data.processId] ?? parsed.data.processId;
  const versionId =
    demoVersionIds[parsed.data.versionId] ?? parsed.data.versionId;
  if (
    !z.string().uuid().safeParse(processId).success ||
    !z.string().uuid().safeParse(versionId).success
  )
    return { ok: false, error: "Process draft not found." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };
  const { error } = await supabase.rpc("save_process_graph", {
    p_process_id: processId,
    p_version_id: versionId,
    p_graph: parsed.data.graph,
  });
  return error
    ? {
        ok: false,
        error:
          "This map could not be saved. Confirm that the version is an editable draft and every connection has a valid step.",
      }
    : { ok: true };
}
