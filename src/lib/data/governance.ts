import "server-only";

import { headers } from "next/headers";

import { listDemoGovernanceRows } from "@/lib/demo-process-store";
import { resolveDemoTenantSlug } from "@/lib/demo-tenant";
import { getProcessSummaries } from "@/lib/data/processes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GovernanceProcessRow = {
  processId: string;
  processName: string;
  department: string;
  lastGovernance: string;
  nextDue: string;
  findings: string;
  health: "HEALTHY" | "NEEDS_ATTENTION" | "CRITICAL" | "NOT_ENOUGH_DATA";
};

export async function getGovernanceOverview(): Promise<GovernanceProcessRow[]> {
  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const tenantSlug =
    requestHeaders.get("x-tenant-slug") ?? (await resolveDemoTenantSlug());

  if (!supabase) {
    return listDemoGovernanceRows(tenantSlug);
  }

  const tenantId = requestHeaders.get("x-tenant-id");
  if (!tenantId) return [];

  const processes = await getProcessSummaries();
  const rows: GovernanceProcessRow[] = [];

  for (const process of processes) {
    const { data: audits } = await supabase
      .from("audits")
      .select("completed_at,calculated_health,override_health")
      .eq("tenant_id", tenantId)
      .eq("process_id", process.id)
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false })
      .limit(1);

    const latest = audits?.[0];
    const healthLabel =
      latest?.override_health ?? latest?.calculated_health ?? null;
    rows.push({
      processId: process.id,
      processName: process.name,
      department: process.department,
      lastGovernance: process.lastAudit,
      nextDue: process.nextAudit,
      findings: healthLabel
        ? `Latest governance health: ${String(healthLabel).replaceAll("_", " ")}`
        : "No completed governance review yet.",
      health: process.health,
    });
  }

  return rows;
}
