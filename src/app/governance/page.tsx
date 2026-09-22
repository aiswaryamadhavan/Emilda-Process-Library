import { ArrowRight, CalendarClock, ClipboardCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { HealthBadge } from "@/components/health-badge";
import { TenantLink } from "@/components/tenant-link";
import { Card, CardContent } from "@/components/ui/card";
import { getGovernanceOverview } from "@/lib/data/governance";

export default async function GovernancePage() {
  const rows = await getGovernanceOverview();

  return (
    <AppShell
      title="Governance"
      description="Review cadence, due dates, and findings for every process in the library."
    >
      {rows.length === 0 ? (
        <Card className="border-dashed bg-white shadow-none">
          <CardContent className="grid min-h-64 place-items-center p-6 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                <ClipboardCheck className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">
                No governance records yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create a process first. Each process will appear here with its
                governance due date and findings.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={row.processId} className="bg-white shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <HealthBadge status={row.health} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {row.department}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--navy)]">
                      {row.processName}
                    </h2>
                  </div>
                  <TenantLink
                    href={`/processes/${row.processId}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted/40"
                  >
                    Open process
                    <ArrowRight className="size-4" />
                  </TenantLink>
                </div>
                <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      Last governance
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {row.lastGovernance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Next due
                    </p>
                    <p className="mt-1 text-sm font-semibold">{row.nextDue}</p>
                  </div>
                  <div className="sm:col-span-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Findings
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {row.findings}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
