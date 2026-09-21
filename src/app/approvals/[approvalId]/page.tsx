import { FocusShell } from "@/components/focus-shell";
import { ApprovalExperience } from "./approval-experience";
export default function ApprovalPage() {
  return (
    <FocusShell
      eyebrow="Process approval"
      title="Purchase Approval"
      subtitle="Version 2.1 · Effective 20 September"
    >
      <ApprovalExperience />
    </FocusShell>
  );
}
