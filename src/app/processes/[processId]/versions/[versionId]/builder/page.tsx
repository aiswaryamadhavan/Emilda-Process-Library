import { FocusShell } from "@/components/focus-shell";
import { ProcessBuilder } from "./process-builder";
import { canDesignProcess } from "@/lib/access";
import { DesignAccessDenied } from "@/components/access-denied";
import { getProcessVersionGraph } from "@/lib/data/processes";
import { getProcessWorkspace } from "@/lib/data/processes";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ processId: string; versionId: string }>;
}) {
  const { processId, versionId } = await params;
  if (!(await canDesignProcess(processId))) return <DesignAccessDenied />;
  const workspace = await getProcessWorkspace(processId, versionId);
  if (workspace?.htmlMap) {
    const prefix = (await headers()).get("x-tenant-path-prefix") ?? "";
    redirect(`${prefix}/processes/${workspace.id}`);
  }
  const process = await getProcessVersionGraph(processId, versionId);
  if (!process) notFound();
  return (
    <FocusShell
      eyebrow={`${process.processName} · v${process.versionLabel} ${process.status.toLowerCase().replaceAll("_", " ")}`}
      title="Editable process map"
      subtitle="This is a starting point, not a finished process. Drag and connect on desktop, or edit every step clearly on mobile."
      wide
    >
      <ProcessBuilder initialGraph={process.graph} />
    </FocusShell>
  );
}
