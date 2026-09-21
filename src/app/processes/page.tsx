import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, Plus } from "lucide-react";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { HealthBadge } from "@/components/health-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getProcessSummaries } from "@/lib/data/processes";

export default async function ProcessesPage() {
  const processes = await getProcessSummaries();
  const localPrefix = (await headers()).get("x-tenant-path-prefix") ?? "";
  const groups = processes.reduce<Record<string, (typeof processes)[number][]>>(
    (result, process) => {
      (result[process.department] ??= []).push(process);
      return result;
    },
    {},
  );
  return (
    <AppShell
      title="Processes"
      description="The agreed way work runs—and the evidence that it is working."
      action={
        <Button asChild className="hidden min-h-11 rounded-xl sm:inline-flex">
          <Link href={`${localPrefix}/processes/new`}>
            <Plus />
            Create process
          </Link>
        </Button>
      }
    >
      <form action={`${localPrefix}/search`}>
        <Input
          name="q"
          aria-label="Search processes"
          placeholder="Search processes"
          className="h-12 rounded-xl bg-white"
        />
      </form>
      <nav
        aria-label="Departments"
        className="mt-4 flex gap-2 overflow-x-auto pb-1"
      >
        {Object.entries(groups).map(([department, items]) => (
          <Link
            key={department}
            href={`#department-${department.toLowerCase().replaceAll(" ", "-")}`}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border bg-white px-3 text-sm font-medium hover:border-[var(--brand-primary)]"
          >
            <Building2 className="size-4 text-[var(--brand-primary)]" />
            {department}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {items.length}
            </span>
          </Link>
        ))}
      </nav>
      <div className="mt-7 space-y-8">
        {processes.length === 0 && (
          <Card className="border-dashed bg-white shadow-none">
            <CardContent className="grid min-h-64 place-items-center p-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                  <Building2 className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">No processes yet</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start with one important recurring process. Answer practical
                  questions and Emilda will create an editable starting map.
                </p>
                <Button asChild className="mt-5 min-h-11">
                  <Link href={`${localPrefix}/processes/new`}>
                    <Plus />
                    Create first process
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {Object.entries(groups).map(([department, items]) => (
          <section
            key={department}
            id={`department-${department.toLowerCase().replaceAll(" ", "-")}`}
            className="scroll-mt-24"
          >
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Department</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--navy)]">
                  {department}
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "process" : "processes"}
              </span>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((process) => (
                <Card
                  key={process.id}
                  className="border-border/70 bg-white shadow-none transition-shadow hover:shadow-sm"
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <HealthBadge status={process.health} />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {process.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-[var(--navy)]">
                          {process.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Owner: {process.owner} · v{process.version}
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-xl"
                      >
                        <Link
                          href={`${localPrefix}/processes/${process.id}`}
                          aria-label={`Open ${process.name}`}
                        >
                          <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-4" />
                        Last audit {process.lastAudit}
                      </span>
                      <span>Next {process.nextAudit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Button
        asChild
        size="lg"
        className="fixed bottom-24 right-4 min-h-12 rounded-full shadow-lg sm:hidden"
      >
        <Link href={`${localPrefix}/processes/new`}>
          <Plus />
          Create process
        </Link>
      </Button>
    </AppShell>
  );
}
