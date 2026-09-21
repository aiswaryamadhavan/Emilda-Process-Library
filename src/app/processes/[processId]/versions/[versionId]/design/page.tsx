import { FocusShell } from "@/components/focus-shell";
import { DesignWizard } from "./design-wizard";
import { canDesignProcess } from "@/lib/access";
import { DesignAccessDenied } from "@/components/access-denied";
export default async function DesignPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  const { processId } = await params;
  if (!(await canDesignProcess(processId))) return <DesignAccessDenied />;
  return (
    <FocusShell
      eyebrow="Purchase Approval · v2.1 draft"
      title="Design the improvement"
      subtitle="Created from Change Request #12"
    >
      <DesignWizard />
    </FocusShell>
  );
}
