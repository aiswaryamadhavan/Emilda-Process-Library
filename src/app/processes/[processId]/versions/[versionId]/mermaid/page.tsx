import { FocusShell } from "@/components/focus-shell";
import { MermaidPanel } from "./mermaid-panel";
import { canDesignProcess } from "@/lib/access";
import { DesignAccessDenied } from "@/components/access-denied";
import { getProcessVersionGraph } from "@/lib/data/processes";
import { notFound } from "next/navigation";
export default async function MermaidPage({
  params,
}: {
  params: Promise<{ processId: string; versionId: string }>;
}) {
  const { processId, versionId } = await params;
  if (!(await canDesignProcess(processId))) return <DesignAccessDenied />;
  const process = await getProcessVersionGraph(processId, versionId);
  if (!process) notFound();
  return (
    <FocusShell
      eyebrow={`${process.processName} · v${process.versionLabel} ${process.status.toLowerCase().replaceAll("_", " ")}`}
      title="Edit with Mermaid"
      subtitle="Edit supported flowchart syntax and see the diagram update beside it. Nothing is applied to the process until you confirm."
      wide
    >
      <MermaidPanel initialGraph={process.graph} />
    </FocusShell>
  );
}
