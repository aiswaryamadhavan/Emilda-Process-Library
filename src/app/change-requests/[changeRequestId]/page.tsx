import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TenantLink } from "@/components/tenant-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
export default function ChangeRequestPage() {
  return (
    <AppShell
      title="Delegated purchase approval"
      description="Change Request #12 · Approved"
    >
      <Badge className="rounded-full bg-emerald-100 text-emerald-800">
        <CheckCircle2 />
        Improvement approved
      </Badge>
      <div className="mt-5 space-y-4">
        <Item label="Problem observed">
          Manager approval is a single dependency and repeatedly exceeds the
          24-hour SLA.
        </Item>
        <Item label="Evidence">
          Three consecutive audit failures and four related issues.
        </Item>
        <Item label="Proposed change">
          Allow Operations Lead approval for purchases below ₹25,000.
        </Item>
        <Item label="Expected effect">
          Faster routine purchasing with unchanged control for larger spend.
        </Item>
      </div>
      <Card className="mt-5 border-teal-200 bg-teal-50/70 shadow-none">
        <CardContent className="p-5">
          <p className="eyebrow">Created automatically</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--navy)]">
            Purchase Approval v2.1 draft
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The active version remains unchanged until v2.1 is approved and
            released.
          </p>
          <Button asChild className="mt-4 min-h-11 rounded-xl">
            <TenantLink href="/processes/purchase-approval/versions/demo/design">
              Continue draft
              <ArrowRight />
            </TenantLink>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
function Item({
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
