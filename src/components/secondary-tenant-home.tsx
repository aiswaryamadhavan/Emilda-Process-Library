import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { TenantLink } from "@/components/tenant-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SecondaryTenantHome() {
  return (
    <AppShell
      title="Good morning, Nina."
      description="Northstar Services process health is separate from every other client."
    >
      <p className="eyebrow">Business process health</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--navy)]">
        2 active processes
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="size-5" />
          <p className="mt-3 text-3xl font-semibold">1</p>
          <p className="text-sm font-semibold">Healthy</p>
        </div>
        <div className="rounded-2xl border bg-amber-50 p-5 text-amber-950">
          <AlertTriangle className="size-5" />
          <p className="mt-3 text-3xl font-semibold">1</p>
          <p className="text-sm font-semibold">Attention</p>
        </div>
      </div>
      <p className="eyebrow mt-9">What needs you</p>
      <Card className="mt-3 shadow-none">
        <CardContent className="p-5">
          <h2 className="text-xl font-semibold">Customer enquiry handoff</h2>
          <p className="mt-2 text-muted-foreground">
            One response-time checkpoint needs review.
          </p>
          <Button asChild className="mt-5 min-h-11 rounded-xl">
            <TenantLink href="/processes">
              Review process
              <ArrowRight />
            </TenantLink>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
