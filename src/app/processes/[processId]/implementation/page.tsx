import { AppShell } from "@/components/app-shell";
import { ImplementationChecklist } from "./implementation-checklist";
export default function ImplementationPage() {
  return (
    <AppShell
      title="Implementation handoff"
      description="Purchase Approval v2.1 · In progress"
    >
      <ImplementationChecklist />
    </AppShell>
  );
}
