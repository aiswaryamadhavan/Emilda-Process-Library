import { FocusShell } from "@/components/focus-shell";
import { AuditRunner } from "./audit-runner";
export default function AuditPage() {
  return (
    <FocusShell
      eyebrow="Weekly Scorecard"
      title="Audit — Week 38"
      subtitle="Health last audit: Healthy"
    >
      <AuditRunner />
    </FocusShell>
  );
}
