import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RoleWorkHome({ role }: { role: "guardian" | "process-owner" }) {
  const guardian = role === "guardian";
  return (
    <AppShell
      title={guardian ? "Today" : "My processes"}
      description={
        guardian
          ? "Three clear priorities. Start with the audit due today."
          : "Two processes are healthy. Dispatch needs your attention."
      }
      viewer={
        guardian
          ? { name: "Kavya Iyer", role: "Process Guardian" }
          : { name: "Vishnu Rao", role: "Process Owner" }
      }
    >
      <div className="grid grid-cols-3 gap-2.5 sm:max-w-xl sm:gap-4">
        <Stat
          value={guardian ? "2" : "2"}
          label={guardian ? "Audits due" : "Healthy"}
          tone="healthy"
        />
        <Stat
          value="1"
          label={guardian ? "Review" : "Attention"}
          tone="attention"
        />
        <Stat value={guardian ? "3" : "0"} label="Issues" tone="critical" />
      </div>
      <p className="eyebrow mt-8">
        {guardian ? "Continue" : "Action required"}
      </p>
      <Card className="mt-3 border-l-4 border-l-[var(--brand-primary)] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
        <CardContent className="p-5 sm:p-7">
          <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-800 shadow-none">
            {guardian ? "Due today" : "Evidence requested"}
          </Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
            {guardian ? "Weekly Scorecard Audit" : "Weekly Dispatch Review"}
          </h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            {guardian
              ? "Resume at checkpoint 4 of 6. Your previous answers are saved."
              : "Upload the completed dispatch check so the Guardian can verify the process."}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 min-h-12 w-full rounded-xl sm:w-auto"
          >
            <Link
              href={
                guardian
                  ? "/audits/scorecard-week-38"
                  : "/processes/dispatch-confirmation"
              }
            >
              {guardian ? "Continue audit" : "View request"}
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <WorkItem
          icon={ClipboardCheck}
          title="Purchase Approval v2.1"
          detail={
            guardian
              ? "Approval follow-up"
              : "Owned by Aishwarya · Needs attention"
          }
          href="/approvals/purchase-v21"
        />
        <WorkItem
          icon={guardian ? AlertTriangle : CheckCircle2}
          title={guardian ? "Dispatch delay" : "Customer Collections"}
          detail={
            guardian
              ? "High issue · Review cause"
              : "Healthy · Audited 8 September"
          }
          href={guardian ? "/issues/invoice-delay" : "/processes"}
        />
      </div>
    </AppShell>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "healthy" | "attention" | "critical";
}) {
  const classes = {
    healthy: "border-emerald-200 bg-white text-emerald-800",
    attention: "border-amber-200 bg-white text-amber-800",
    critical: "border-red-200 bg-white text-red-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
function WorkItem({
  icon: Icon,
  title,
  detail,
  href,
}: {
  icon: typeof FileCheck2;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-24 items-center gap-4 rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] transition-colors hover:bg-muted/40"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-[var(--navy)]">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {detail}
        </span>
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
