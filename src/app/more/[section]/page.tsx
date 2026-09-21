import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
const content: Record<
  string,
  { title: string; description: string; rows: string[] }
> = {
  users: {
    title: "Users & roles",
    description: "People can hold more than one tenant role.",
    rows: [
      "Aishwarya Menon · Approver · Process Owner",
      "Vishnu Rao · Process Guardian",
      "Neha Shah · Contributor",
      "Priya Nair · Tenant Admin",
    ],
  },
  branding: {
    title: "Branding",
    description: "CSS variables apply branding without a separate frontend.",
    rows: [
      "Portal name · Acme Operations",
      "Primary color · Deep teal",
      "Accent color · Mint",
      "Sign-in provider · Google Workspace",
    ],
  },
  access: {
    title: "Process access",
    description:
      "Access is enforced in the server and database—not by hiding links.",
    rows: [
      "Weekly Scorecard · Everyone",
      "Purchase Approval · Finance + assigned approvers",
      "Dispatch Confirmation · Fulfilment + Process Guardian",
    ],
  },
  activity: {
    title: "Activity log",
    description: "This history cannot be edited or deleted by tenant users.",
    rows: [
      "Aishwarya approved Purchase Approval v2.1",
      "Vishnu completed Weekly Scorecard Audit",
      "Health changed from Healthy to Needs attention",
      "Change Request #12 created v2.1 draft",
    ],
  },
  notifications: {
    title: "Notifications",
    description: "Critical events arrive immediately; routine work is grouped.",
    rows: [
      "Approval requested · Purchase Approval v2.1",
      "Audit due today · Weekly Scorecard",
      "Critical issue opened · Invoice approval delays",
    ],
  },
};
export default async function MoreSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = content[section] ?? {
    title: "Integrations",
    description:
      "Clean extension points for later group sync and evidence events.",
    rows: [
      "Authentication · Google Workspace only",
      "Exact-email access invitations · Active",
      "SCIM · Phase 2",
    ],
  };
  return (
    <AppShell title={item.title} description={item.description}>
      <Card className="shadow-none">
        <CardContent className="divide-y p-0">
          {item.rows.map((row) => (
            <div key={row} className="min-h-16 p-5">
              {row}
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
