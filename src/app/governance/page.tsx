import { ArrowRight, CalendarCheck, CircleAlert, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TenantLink } from "@/components/tenant-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const work = [
  {
    icon: CalendarCheck,
    eyebrow: "Audit · due today",
    title: "Weekly Scorecard",
    detail: "4 of 7 checkpoints complete",
    action: "Continue audit",
    href: "/audits/scorecard-week-38",
    tone: "bg-amber-50 text-amber-900",
  },
  {
    icon: CircleAlert,
    eyebrow: "Critical issue",
    title: "Invoice approval delays",
    detail: "Repeated for 3 audits",
    action: "Review issue",
    href: "/issues/invoice-delay",
    tone: "bg-red-50 text-red-900",
  },
  {
    icon: FileText,
    eyebrow: "Governance note",
    title: "September note",
    detail: "Draft ready to publish",
    action: "Review note",
    href: "/governance-notes/september",
    tone: "bg-teal-50 text-teal-900",
  },
];
export default function GovernancePage() {
  return (
    <AppShell
      title="Governance"
      description="Observe, detect, correct, and improve—without running the client’s process for them."
    >
      <p className="eyebrow">Today</p>
      <div className="mt-4 grid gap-4">
        {work.map(({ icon: Icon, ...item }) => (
          <Card key={item.title} className="shadow-none">
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <div
                className={`grid size-12 shrink-0 place-items-center rounded-xl ${item.tone}`}
              >
                <Icon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{item.eyebrow}</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--navy)]">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="min-h-11 w-full rounded-xl sm:w-auto"
              >
                <TenantLink href={item.href}>
                  {item.action}
                  <ArrowRight />
                </TenantLink>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full bg-white px-3 py-2">
          2 audits due
        </Badge>
        <Badge variant="outline" className="rounded-full bg-white px-3 py-2">
          3 unresolved issues
        </Badge>
        <Badge variant="outline" className="rounded-full bg-white px-3 py-2">
          1 approval waiting
        </Badge>
      </div>
    </AppShell>
  );
}
