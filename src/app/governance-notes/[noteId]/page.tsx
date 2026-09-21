import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PublishNoteButton } from "./publish-note-button";
export default function GovernanceNotePage() {
  return (
    <AppShell title="Monthly Governance Note" description="September · Draft">
      <div className="space-y-4">
        <Section label="Overall">
          8 Healthy · 3 Need Attention · 1 Critical
        </Section>
        <Section label="Key issue">
          Purchase approval continues to exceed the 24-hour SLA.
        </Section>
        <Section label="Root cause">Manager approval dependency.</Section>
        <Section label="Action">
          Version 2.1 proposes delegated approval below ₹25,000.
        </Section>
        <Section label="Improvements completed">
          Dispatch confirmation automated. Daily reconciliation step removed.
        </Section>
        <Section label="Owner action required">
          Approve Purchase Approval v2.1.
        </Section>
      </div>
      <PublishNoteButton />
      <p className="mt-2 text-sm text-muted-foreground">
        Publishing creates an immutable revision.
      </p>
    </AppShell>
  );
}
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="eyebrow">{label}</p>
        <p className="mt-2 leading-7">{children}</p>
      </CardContent>
    </Card>
  );
}
