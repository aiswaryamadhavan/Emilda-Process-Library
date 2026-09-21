import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Code2,
  FileCheck2,
  GitCompareArrows,
  Link2,
  Network,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { HealthBadge } from "@/components/health-badge";
import { ProcessMapPreview } from "@/components/process-map-preview";
import { ProcessResourceLinks } from "@/components/process-resource-links";
import { TenantLink } from "@/components/tenant-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canDesignProcess } from "@/lib/access";
import { getProcessWorkspace } from "@/lib/data/processes";

export default async function ProcessPage({
  params,
}: PageProps<"/processes/[processId]">) {
  const { processId } = await params;
  const process = await getProcessWorkspace(processId);
  if (!process) notFound();

  const editable =
    ["DRAFT", "CHANGES_REQUESTED"].includes(process.status) &&
    (await canDesignProcess(processId));
  const primaryHref = editable
    ? `/processes/${process.id}/versions/${process.versionId}/builder`
    : "#process-map";
  const primaryLabel = editable
    ? "Continue process design"
    : "View process map";

  return (
    <AppShell
      title={process.name}
      description={process.purpose}
      action={<HealthBadge status={process.health} />}
    >
      <section className="rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
          <MetaItem
            icon={UserRound}
            label="Process Owner"
            value={process.owner}
          />
          <MetaItem
            icon={ShieldCheck}
            label="Current state"
            value={process.status.replaceAll("_", " ")}
          />
          <MetaItem
            icon={CalendarClock}
            label="Last audit"
            value={process.lastAudit}
          />
          <MetaItem
            icon={Clock3}
            label="Next audit"
            value={process.nextAudit}
          />
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {process.department} · Version{" "}
            <strong className="text-foreground">{process.version}</strong>
          </p>
          <Button asChild className="min-h-11 w-full sm:w-auto">
            <TenantLink href={primaryHref}>
              {primaryLabel}
              <ArrowRight />
            </TenantLink>
          </Button>
        </div>
      </section>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border bg-white p-1">
          <TabsTrigger value="overview" className="min-h-10 px-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="process" className="min-h-10 px-4">
            Process
          </TabsTrigger>
          <TabsTrigger value="metrics" className="min-h-10 px-4">
            Metrics
          </TabsTrigger>
          <TabsTrigger value="resources" className="min-h-10 px-4">
            <Link2 className="size-4" aria-hidden="true" />
            Templates
            {process.resourceLinks.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {process.resourceLinks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="min-h-10 px-4">
            Issues
          </TabsTrigger>
          <TabsTrigger value="versions" className="min-h-10 px-4">
            Versions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard title="Why this process exists" icon={FileCheck2}>
              {process.purpose}
            </InfoCard>
            <InfoCard title="The outcome we expect" icon={CheckCircle2}>
              {process.goal}
            </InfoCard>
            <InfoCard title="How work happens today" icon={Clock3}>
              {process.currentState}
            </InfoCard>
            <InfoCard title="The agreed future state" icon={ShieldCheck}>
              {process.futureState}
            </InfoCard>
          </div>

          <Card id="process-map" className="scroll-mt-24 overflow-hidden">
            <CardHeader className="gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">How work moves</p>
                <CardTitle className="mt-1 text-lg font-semibold">
                  {process.graph.nodes.length} clear steps from trigger to
                  outcome
                </CardTitle>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <TenantLink
                    href={`/processes/${process.id}/versions/${process.versionId}/mermaid`}
                  >
                    <Code2 />
                    Mermaid
                  </TenantLink>
                </Button>
                <Button asChild>
                  <TenantLink
                    href={`/processes/${process.id}/versions/${process.versionId}/builder`}
                  >
                    <Network />
                    Open map
                  </TenantLink>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {process.graph.nodes.length ? (
                <ProcessMapPreview graph={process.graph} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No steps have been added to this version yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <SmallFact label="Trigger" value={process.trigger} />
            <SmallFact label="Department" value={process.department} />
            <SmallFact
              label="Evidence"
              value={
                process.graph.nodes.find((node) => node.evidence)?.evidence ??
                "Evidence requirements to confirm"
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="process" className="mt-5 space-y-4">
          <Card>
            <CardHeader className="border-b pb-4">
              <p className="eyebrow">Step-by-step operating standard</p>
              <CardTitle className="mt-1 text-lg font-semibold">
                Who does what, by when, and how it is proved
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {process.graph.nodes.map((node, index) => (
                <div
                  key={node.id}
                  className="grid gap-3 p-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-start sm:p-5"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{node.title}</h3>
                      <Badge
                        variant="outline"
                        className="rounded-md text-[10px]"
                      >
                        {node.type}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {node.actor ?? "Role to confirm"}
                      {node.timing ? ` · ${node.timing}` : ""}
                    </p>
                    {node.why && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {node.why}
                      </p>
                    )}
                  </div>
                  {node.evidence && (
                    <span className="text-xs font-medium text-muted-foreground">
                      Evidence: {node.evidence}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          {process.exceptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Exceptions and escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {process.exceptions.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <p className="font-semibold">{item.scenario}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.response}
                    </p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Escalation: {item.escalation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="mt-5 grid gap-4 md:grid-cols-2">
          {process.metrics.length ? (
            process.metrics.map((metric) => (
              <InfoCard key={metric.id} title={metric.name} icon={FileCheck2}>
                {metric.target} · {metric.cadence}
              </InfoCard>
            ))
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Success metrics still need to be defined for this draft.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="mt-5">
          <ProcessResourceLinks
            processId={process.id}
            versionId={process.versionId}
            initialLinks={process.resourceLinks}
            editable={editable}
          />
        </TabsContent>

        <TabsContent value="issues" className="mt-5 space-y-3">
          {process.openIssues.length ? (
            process.openIssues.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Badge variant="outline">{issue.severity}</Badge>
                    <h3 className="mt-2 font-semibold">{issue.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {issue.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <TenantLink href={`/issues/${issue.id}`}>
                      Review issue
                    </TenantLink>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold">No unresolved issues</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Audit findings that need action will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-5 space-y-3">
          {process.versions.map((version, index) => (
            <Card key={version.id}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Version {version.label}</p>
                    <Badge variant="outline">
                      {version.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {version.changeReason} · {version.createdAt}
                  </p>
                </div>
                {index === 0 && process.versions.length > 1 && (
                  <Button asChild variant="outline">
                    <TenantLink
                      href={`/processes/${process.id}/versions/${version.id}/compare`}
                    >
                      <GitCompareArrows />
                      Compare
                    </TenantLink>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileCheck2;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
          <p className="eyebrow">{title}</p>
        </div>
      </CardHeader>
      <CardContent className="text-[15px] leading-6">{children}</CardContent>
    </Card>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}
