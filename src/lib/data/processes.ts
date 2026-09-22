import "server-only";

import { headers } from "next/headers";

import {
  processes as demoProcesses,
  purchaseApprovalGraph,
  weeklyScorecardGraph,
} from "@/lib/demo-data";
import type { ProcessGraph } from "@/lib/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProcessSummary = {
  id: string;
  name: string;
  department: string;
  owner: string;
  version: string;
  versionId: string;
  health: "HEALTHY" | "NEEDS_ATTENTION" | "CRITICAL" | "NOT_ENOUGH_DATA";
  lastAudit: string;
  nextAudit: string;
  status: string;
  purpose: string;
};

export type ProcessWorkspace = ProcessSummary & {
  goal: string;
  trigger: string;
  currentState: string;
  futureState: string;
  graph: ProcessGraph;
  metrics: { id: string; name: string; target: string; cadence: string }[];
  exceptions: {
    id: string;
    scenario: string;
    response: string;
    escalation: string;
  }[];
  openIssues: { id: string; title: string; severity: string; status: string }[];
  versions: {
    id: string;
    label: string;
    status: string;
    changeReason: string;
    createdAt: string;
  }[];
  resourceLinks: {
    id: string;
    label: string;
    resourceType: "TEMPLATE" | "DOCUMENT" | "FORM" | "EXAMPLE" | "OTHER";
    url: string;
    description: string;
  }[];
  htmlMap: { attachmentId: string; filename: string } | null;
};

type SupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

function formatDate(value: string | null | undefined, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

async function requestTenantId(supabase: SupabaseClient) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-tenant-id");
  if (forwarded) return forwarded;
  const slug = requestHeaders.get("x-tenant-slug");
  if (!slug) return null;
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

async function membershipNames(
  supabase: SupabaseClient,
  tenantId: string,
  membershipIds: string[],
) {
  const ids = [...new Set(membershipIds.filter(Boolean))];
  if (!ids.length) return new Map<string, string>();
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("id,user_id")
    .eq("tenant_id", tenantId)
    .in("id", ids);
  const userIds = (memberships ?? []).map((item) => item.user_id);
  if (!userIds.length) return new Map<string, string>();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,display_name")
    .in("id", userIds);
  const profileNames = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  return new Map(
    (memberships ?? []).map((membership) => [
      membership.id,
      profileNames.get(membership.user_id) ?? "Assigned user",
    ]),
  );
}

function demoSummaries(): ProcessSummary[] {
  return demoProcesses.map((process) => ({
    ...process,
    versionId: "demo",
  }));
}

export async function getProcessSummaries(): Promise<ProcessSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoSummaries();
  const tenantId = await requestTenantId(supabase);
  if (!tenantId) return [];

  const { data } = await supabase.rpc("list_my_process_summaries", {
    p_tenant_id: tenantId,
  });
  const rows = (data ?? []) as {
    process_id: string;
    process_name: string;
    department_name: string;
    owner_name: string;
    version_id: string | null;
    major_version: number | null;
    minor_version: number | null;
    version_status: string | null;
    health: ProcessSummary["health"];
    purpose: string;
    last_audit_at: string | null;
    next_audit_at: string | null;
  }[];

  return rows.map((process) => ({
    id: process.process_id,
    name: process.process_name,
    department: process.department_name,
    owner: process.owner_name,
    version:
      process.major_version === null || process.minor_version === null
        ? "1.0"
        : `${process.major_version}.${process.minor_version}`,
    versionId: process.version_id ?? "",
    health: process.health,
    lastAudit: formatDate(process.last_audit_at, "Not audited"),
    nextAudit: formatDate(process.next_audit_at, "Not scheduled"),
    status: process.version_status ?? "DRAFT",
    purpose: process.purpose,
  }));
}

function demoWorkspace(processId: string): ProcessWorkspace | null {
  const process = demoSummaries().find((item) => item.id === processId);
  if (!process) return null;
  const graph =
    processId === "purchase-approval"
      ? purchaseApprovalGraph
      : weeklyScorecardGraph;
  return {
    ...process,
    goal: "Work is completed on time, with visible ownership and evidence.",
    trigger: "A valid request is received.",
    currentState: "The current method depends on manual follow-up.",
    futureState: "The agreed process makes ownership and evidence visible.",
    graph,
    metrics: [
      {
        id: "demo-metric",
        name: "Completed on time",
        target: "95% within the agreed SLA",
        cadence: "Weekly",
      },
    ],
    exceptions: [],
    openIssues: [],
    versions: [
      {
        id: "demo",
        label: process.version,
        status: process.status,
        changeReason: "Demo process version",
        createdAt: "12 Sep",
      },
    ],
    resourceLinks: [],
    htmlMap: null,
  };
}

export async function getProcessWorkspace(
  processId: string,
  requestedVersionId?: string,
): Promise<ProcessWorkspace | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoWorkspace(processId);
  const tenantId = await requestTenantId(supabase);
  if (!tenantId) return null;
  const admin = createSupabaseAdminClient();

  let processQuery = supabase
    .from("processes")
    .select(
      "id,name,department_id,current_active_version_id,current_health,next_audit_at",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  processQuery = isUuid(processId)
    ? processQuery.eq("id", processId)
    : processQuery.eq("process_key", processId);
  const { data: process } = await processQuery.maybeSingle();
  if (!process) return null;

  const { data: versions } = await supabase
    .from("process_versions")
    .select(
      "id,major_version,minor_version,status,change_reason,purpose,goal,trigger_description,current_state,future_state,owner_membership_id,created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("process_id", process.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const version =
    (requestedVersionId && isUuid(requestedVersionId)
      ? versions?.find((item) => item.id === requestedVersionId)
      : undefined) ??
    versions?.find((item) => item.id === process.current_active_version_id) ??
    versions?.[0];
  if (!version) return null;

  const [
    departmentResult,
    nodesResult,
    edgesResult,
    metricsResult,
    exceptionsResult,
    auditsResult,
    issuesResult,
    resourceLinksResult,
    htmlMapResult,
  ] = await Promise.all([
    process.department_id
      ? supabase
          .from("departments")
          .select("name")
          .eq("tenant_id", tenantId)
          .eq("id", process.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase
      .from("process_nodes")
      .select(
        "id,node_key,node_type,title,action_text,timing,why,evidence,position_x,position_y,sort_order,metadata",
      )
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("version_id", version.id)
      .order("sort_order"),
    supabase
      .from("process_edges")
      .select("id,source_node_id,target_node_id,label,sort_order")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("version_id", version.id)
      .order("sort_order"),
    supabase
      .from("process_metrics")
      .select("id,name,target,cadence,sort_order")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("version_id", version.id)
      .order("sort_order"),
    supabase
      .from("process_exceptions")
      .select("id,scenario,response,escalation,sort_order")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("version_id", version.id)
      .order("sort_order"),
    supabase
      .from("audits")
      .select("completed_at")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false })
      .limit(1),
    supabase
      .from("issues")
      .select("id,title,severity,status")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .not("status", "in", "(VERIFIED,CLOSED)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("process_resource_links")
      .select("id,label,resource_type,url,description,created_at")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("version_id", version.id)
      .order("created_at"),
    admin
      ? admin
          .from("attachments")
          .select("id,filename")
          .eq("tenant_id", tenantId)
          .eq("process_id", process.id)
          .eq("mime_type", "text/html")
          .eq("status", "AVAILABLE")
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { id: string; filename: string }[] }),
  ]);

  const nodes = nodesResult.data ?? [];
  const nodeKeys = new Map(nodes.map((node) => [node.id, node.node_key]));
  const graph: ProcessGraph = {
    direction: "LR",
    nodes: nodes.map((node) => ({
      id: node.node_key,
      type: node.node_type,
      title: node.title,
      actor:
        typeof node.metadata === "object" && node.metadata
          ? String(
              (node.metadata as Record<string, unknown>).suggested_actor ?? "",
            ) || undefined
          : undefined,
      action: node.action_text || undefined,
      timing: node.timing || undefined,
      why: node.why || undefined,
      evidence: node.evidence || undefined,
      position: {
        x: Number(node.position_x),
        y: Number(node.position_y),
      },
    })),
    edges: (edgesResult.data ?? [])
      .map((edge) => ({
        id: edge.id,
        source: nodeKeys.get(edge.source_node_id) ?? "",
        target: nodeKeys.get(edge.target_node_id) ?? "",
        label: edge.label || undefined,
      }))
      .filter((edge) => edge.source && edge.target),
  };
  const ownerNames = await membershipNames(
    supabase,
    tenantId,
    version.owner_membership_id ? [version.owner_membership_id] : [],
  );

  return {
    id: process.id,
    name: process.name,
    department: departmentResult.data?.name ?? "Unassigned",
    owner: version.owner_membership_id
      ? (ownerNames.get(version.owner_membership_id) ?? "Assigned user")
      : "Owner to confirm",
    version: `${version.major_version}.${version.minor_version}`,
    versionId: version.id,
    health: process.current_health,
    lastAudit: formatDate(auditsResult.data?.[0]?.completed_at, "Not audited"),
    nextAudit: formatDate(process.next_audit_at, "Not scheduled"),
    status: version.status,
    purpose: version.purpose ?? "Purpose to confirm during process design.",
    goal: version.goal ?? "Outcome to confirm during process design.",
    trigger: version.trigger_description ?? "Trigger to confirm.",
    currentState: version.current_state ?? "Current state to confirm.",
    futureState: version.future_state ?? "Future state to confirm.",
    graph,
    metrics: (metricsResult.data ?? []).map((metric) => ({
      id: metric.id,
      name: metric.name,
      target: metric.target,
      cadence: metric.cadence ?? "Cadence to confirm",
    })),
    exceptions: (exceptionsResult.data ?? []).map((exception) => ({
      id: exception.id,
      scenario: exception.scenario,
      response: exception.response,
      escalation: exception.escalation ?? "Escalation to confirm",
    })),
    openIssues: issuesResult.data ?? [],
    versions: (versions ?? []).map((item) => ({
      id: item.id,
      label: `${item.major_version}.${item.minor_version}`,
      status: item.status,
      changeReason: item.change_reason,
      createdAt: formatDate(item.created_at, "Recently"),
    })),
    resourceLinks: (resourceLinksResult.data ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      resourceType: item.resource_type as
        | "TEMPLATE"
        | "DOCUMENT"
        | "FORM"
        | "EXAMPLE"
        | "OTHER",
      url: item.url,
      description: item.description ?? "",
    })),
    htmlMap: htmlMapResult.data?.[0]
      ? {
          attachmentId: htmlMapResult.data[0].id,
          filename: htmlMapResult.data[0].filename,
        }
      : null,
  };
}

export async function getProcessVersionGraph(
  processId: string,
  versionId: string,
) {
  const workspace = await getProcessWorkspace(processId, versionId);
  if (!workspace) {
    const supabase = await createSupabaseServerClient();
    if (supabase) return null;
    return {
      processId,
      versionId,
      processName: processId
        .split("-")
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(" "),
      versionLabel: "1.0",
      status: "DRAFT",
      graph: { direction: "LR", nodes: [], edges: [] } satisfies ProcessGraph,
    };
  }
  return {
    processId: workspace.id,
    versionId: workspace.versionId,
    processName: workspace.name,
    versionLabel: workspace.version,
    status: workspace.status,
    graph: workspace.graph,
  };
}
