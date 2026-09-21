import Link from "next/link";
import { AlertTriangle, ArrowRight, Repeat2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function IssuePage() {
  return (
    <AppShell
      title="Invoice approval delays"
      description="Issue #32 · Purchase Approval · Open"
    >
      <Card className="border-red-200 bg-red-50/60 shadow-none">
        <CardContent className="flex gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-700" />
          <div>
            <p className="font-semibold text-red-950">High severity</p>
            <p className="mt-1 text-sm leading-6 text-red-900/75">
              Approval SLA was missed in three consecutive audits.
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Info title="Likely root cause">Unclear responsibility</Info>
        <Info title="Assigned to">Aishwarya Menon</Info>
        <Info title="Evidence">Audits from 29 Aug, 5 Sep, and 12 Sep</Info>
        <Info title="Resolution needed">
          Define delegated approval below ₹25,000
        </Info>
      </div>
      <Card className="mt-5 shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Repeat2 className="size-5 text-[var(--attention)]" />
            <CardTitle className="text-lg">Recurring pattern found</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          4 of the last 7 Purchase Approval issues relate to unclear
          responsibility.
        </CardContent>
      </Card>
      <Button
        asChild
        size="lg"
        className="mt-5 min-h-12 w-full rounded-xl sm:w-auto"
      >
        <Link href="/change-requests/delegated-approval">
          Create improvement
          <ArrowRight />
        </Link>
      </Button>
    </AppShell>
  );
}
function Info({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="eyebrow">{title}</p>
        <p className="mt-2 leading-7">{children}</p>
      </CardContent>
    </Card>
  );
}
