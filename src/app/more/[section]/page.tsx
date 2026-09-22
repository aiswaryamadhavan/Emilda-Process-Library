import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
const content: Record<
  string,
  { title: string; description: string; rows: string[] }
> = {
  users: {
    title: "Users & roles",
    description: "Only Paul and Aishwarya can sign in right now.",
    rows: [
      "Paul · Owner · paul@emildasolutions.com",
      "Aishwarya · Admin · aiswarya@emildasolutions.com",
    ],
  },
  branding: {
    title: "Branding",
    description: "CSS variables apply branding without a separate frontend.",
    rows: [],
  },
  access: {
    title: "Process access",
    description:
      "Access is enforced in the server and database—not by hiding links.",
    rows: [],
  },
  activity: {
    title: "Activity log",
    description: "This history cannot be edited or deleted by tenant users.",
    rows: [],
  },
  notifications: {
    title: "Notifications",
    description: "Critical events arrive immediately; routine work is grouped.",
    rows: [],
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
          {item.rows.length === 0 ? (
            <div className="min-h-16 p-5 text-sm text-muted-foreground">
              Nothing recorded yet.
            </div>
          ) : (
            item.rows.map((row) => (
              <div key={row} className="min-h-16 p-5">
                {row}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
