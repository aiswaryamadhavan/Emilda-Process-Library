import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { TenantLink } from "@/components/tenant-link";
import { RoleWorkHome } from "@/components/role-work-home";
import { SecondaryTenantHome } from "@/components/secondary-tenant-home";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProcessSummaries, type ProcessSummary } from "@/lib/data/processes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeTenantShellContext } from "@/lib/tenant";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const requestHeaders = await headers();
  const tenantSlug = requestHeaders.get("x-tenant-slug");
  const shellContext = decodeTenantShellContext(
    requestHeaders.get("x-tenant-shell-context"),
  );
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    if (!tenantSlug) {
      const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
      if (isPlatformAdmin) redirect("/admin/tenants");
    }
    return (
      <LiveTenantHome
        processes={await getProcessSummaries()}
        firstName={(shellContext?.viewerName ?? "there").split(" ")[0]}
      />
    );
  }

  if (role === "guardian" || role === "process-owner") {
    return <RoleWorkHome role={role} />;
  }

  if (tenantSlug === "northstar") return <SecondaryTenantHome />;

  return (
    <AppShell
      title="Good morning, Aishwarya"
      description="Saturday, 12 September · Here is the only work that needs your attention."
    >
      <section aria-labelledby="health-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Business health</p>
            <h2 id="health-heading" className="section-title mt-1">
              12 active processes
            </h2>
          </div>
          <Badge
            variant="outline"
            className="hidden rounded-full bg-white px-3 py-1.5 font-medium text-muted-foreground sm:inline-flex"
          >
            Updated today
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
          <HealthStat label="Healthy" count={8} tone="healthy" />
          <HealthStat label="Attention" count={3} tone="attention" />
          <HealthStat label="Critical" count={1} tone="critical" />
        </div>
      </section>

      <section aria-labelledby="attention-heading" className="mt-8">
        <div className="flex items-center gap-2">
          <CircleAlert
            className="size-4 text-[var(--critical)]"
            aria-hidden="true"
          />
          <p className="eyebrow">What needs you</p>
        </div>
        <h2 id="attention-heading" className="section-title mt-1">
          One decision, then you&apos;re done
        </h2>

        <Card className="relative mt-4 overflow-hidden border-l-4 border-l-[var(--critical)] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div className="min-w-0">
              <Badge className="rounded-full border border-red-200 bg-red-50 text-red-800 shadow-none">
                Approval required
              </Badge>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                Purchase Approval · v2.1
              </h3>
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">
                Delegated approval below ₹25,000 removes a recurring two-day
                delay. Effective 20 September.
              </p>
            </div>
            <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
              <TenantLink href="/approvals/purchase-v21">
                Review process
                <ArrowRight />
              </TenantLink>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="pb-2">
            <p className="eyebrow">Changed this month</p>
            <CardTitle className="mt-1 text-lg font-semibold">
              3 improvements released
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-1 sm:grid-cols-3 lg:grid-cols-1">
            {[
              "Dispatch confirmation automated",
              "Daily reconciliation step removed",
              "Scorecard evidence made visible",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2
                  className="mt-0.5 size-[18px] shrink-0 text-[var(--healthy)]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="eyebrow">Health direction</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-lg font-semibold">
              Purchase is improving
              <TrendingUp className="size-[18px] text-[var(--healthy)]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div
              className="grid grid-cols-4 gap-2"
              aria-label="Health history: June critical, July needs attention, August needs attention, September healthy"
            >
              <HistoryMonth label="Jun" status="Critical" tone="critical" />
              <HistoryMonth label="Jul" status="Attention" tone="attention" />
              <HistoryMonth label="Aug" status="Attention" tone="attention" />
              <HistoryMonth label="Sep" status="Healthy" tone="healthy" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              Based on the last four audits
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function LiveTenantHome({
  processes,
  firstName,
}: {
  processes: ProcessSummary[];
  firstName: string;
}) {
  const active = processes.filter((process) => process.status === "ACTIVE");
  const healthy = active.filter(
    (process) => process.health === "HEALTHY",
  ).length;
  const attention = active.filter(
    (process) => process.health === "NEEDS_ATTENTION",
  ).length;
  const critical = active.filter(
    (process) => process.health === "CRITICAL",
  ).length;
  const priority = processes
    .filter(
      (process) =>
        process.health === "CRITICAL" ||
        process.health === "NEEDS_ATTENTION" ||
        ["DRAFT", "CHANGES_REQUESTED", "APPROVAL_PENDING"].includes(
          process.status,
        ),
    )
    .sort((left, right) => {
      const rank = (process: ProcessSummary) =>
        process.health === "CRITICAL"
          ? 0
          : process.status === "APPROVAL_PENDING"
            ? 1
            : process.health === "NEEDS_ATTENTION"
              ? 2
              : 3;
      return rank(left) - rank(right);
    })
    .slice(0, 3);
  return (
    <AppShell
      title={`Good morning, ${firstName}`}
      description="Here is the process work that deserves attention now."
    >
      <section aria-labelledby="live-health-heading">
        <p className="eyebrow">Business health</p>
        <h2 id="live-health-heading" className="section-title mt-1">
          {active.length} active {active.length === 1 ? "process" : "processes"}
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
          <HealthStat label="Healthy" count={healthy} tone="healthy" />
          <HealthStat label="Attention" count={attention} tone="attention" />
          <HealthStat label="Critical" count={critical} tone="critical" />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="live-priority-heading">
        <p className="eyebrow">What needs you</p>
        <h2 id="live-priority-heading" className="section-title mt-1">
          {priority.length
            ? `${priority.length} ${priority.length === 1 ? "item" : "items"} to move forward`
            : "Nothing urgent right now"}
        </h2>
        <div className="mt-4 grid gap-3">
          {priority.map((process) => (
            <Card
              key={process.id}
              className={`bg-white shadow-none ${
                process.health === "CRITICAL"
                  ? "border-l-4 border-l-[var(--critical)]"
                  : ""
              }`}
            >
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {process.status.replaceAll("_", " ")}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {process.department}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{process.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {process.status === "DRAFT"
                      ? "Complete the process map, ownership, metrics, and review details."
                      : process.purpose}
                  </p>
                </div>
                <Button asChild className="min-h-11 w-full sm:w-auto">
                  <TenantLink href={`/processes/${process.id}`}>
                    {process.status === "DRAFT" ? "Continue" : "Review"}
                    <ArrowRight />
                  </TenantLink>
                </Button>
              </CardContent>
            </Card>
          ))}
          {processes.length === 0 && (
            <Card className="border-dashed bg-white shadow-none">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold">No processes yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Document one important recurring process to begin governance.
                </p>
                <Button asChild className="mt-5 min-h-11">
                  <TenantLink href="/processes/new">
                    Create process
                    <ArrowRight />
                  </TenantLink>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function HealthStat({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "healthy" | "attention" | "critical";
}) {
  const tones = {
    healthy: {
      dot: "bg-[var(--healthy)]",
      number: "text-emerald-800",
      border: "border-emerald-200/80",
    },
    attention: {
      dot: "bg-[var(--attention)]",
      number: "text-amber-800",
      border: "border-amber-200/90",
    },
    critical: {
      dot: "bg-[var(--critical)]",
      number: "text-red-800",
      border: "border-red-200/80",
    },
  };
  const style = tones[tone];
  return (
    <div className={`rounded-xl border bg-white p-3.5 sm:p-5 ${style.border}`}>
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${style.dot}`} aria-hidden />
        <span className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 text-3xl font-semibold tracking-[-0.04em] ${style.number}`}
      >
        {count}
      </p>
    </div>
  );
}

function HistoryMonth({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: "healthy" | "attention" | "critical";
}) {
  const tones = {
    healthy: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    attention: "bg-amber-50 text-amber-800 ring-amber-200",
    critical: "bg-red-50 text-red-800 ring-red-200",
  };
  return (
    <div className={`rounded-lg p-2.5 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 truncate text-[10px] font-medium sm:text-xs">
        {status}
      </p>
    </div>
  );
}
