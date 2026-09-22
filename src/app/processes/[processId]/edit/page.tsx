import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { FocusShell } from "@/components/focus-shell";
import {
  canCreateProcesses,
  DEMO_USER_COOKIE,
} from "@/lib/allowed-users";
import { getProcessWorkspace } from "@/lib/data/processes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProcessStarterInput } from "@/lib/domain/process-starter";
import { ProcessStarter } from "@/app/processes/new/process-starter";

export default async function EditProcessPage({
  params,
}: PageProps<"/processes/[processId]/edit">) {
  const { processId } = await params;
  const process = await getProcessWorkspace(processId);
  if (!process) notFound();

  const requestHeaders = await headers();
  const tenantPathPrefix = requestHeaders.get("x-tenant-path-prefix") ?? "";
  const supabase = await createSupabaseServerClient();
  const demoEmail = (await cookies()).get(DEMO_USER_COOKIE)?.value;

  if (!supabase && !canCreateProcesses(demoEmail)) {
    redirect(`${tenantPathPrefix}/processes/${processId}`);
  }

  let departments = ["Operations", "Finance", "Fulfilment", "Sales"];
  if (supabase) {
    const tenantId = requestHeaders.get("x-tenant-id");
    if (tenantId) {
      const { data } = await supabase
        .from("departments")
        .select("name")
        .eq("tenant_id", tenantId)
        .order("name");
      if (data?.length) departments = data.map(({ name }) => name);
    }
  }

  const starterInput: ProcessStarterInput = {
    name: process.name,
    department: process.department,
    goal: process.goal,
    problem: process.problemSolved,
    currentMethod: "",
    trigger: process.trigger,
    ownerRole: process.owner,
    contributors: process.guardian,
    inputs: "",
    output: process.endingPoint,
    evidence: "",
    exceptions: "",
    cadence: process.auditDuration,
    constraints: "",
    auditQuestions: process.auditQuestions,
    resourceLinks: process.resourceLinks.map((link) => ({
      label: link.label,
      resourceType: link.resourceType,
      url: link.url,
      description: link.description,
    })),
  };

  return (
    <FocusShell
      eyebrow="Edit process"
      title="Create the next version"
      subtitle="Walk through the same three steps—details, templates and links, then the HTML map. Saving creates a new version; earlier versions stay in the history."
    >
      <ProcessStarter
        mode="edit"
        processId={process.id}
        departments={departments}
        initial={{
          input: starterInput,
          guardianName: process.guardian,
          existingHtmlFilename: process.htmlMap?.filename ?? null,
        }}
      />
    </FocusShell>
  );
}
