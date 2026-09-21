import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DesignAccessDenied() {
  return (
    <AppShell
      title="You can view this process"
      description="Only its assigned Process Guardian or a Tenant Admin can edit the design."
    >
      <Card className="max-w-xl shadow-none">
        <CardContent className="p-7">
          <LockKeyhole className="size-8 text-[var(--brand-primary)]" />
          <h2 className="mt-4 text-xl font-semibold">
            Editing is not available for your role
          </h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            Ask the Process Guardian or Tenant Admin if this process needs a
            design change. Approved content is never edited in place.
          </p>
          <Button asChild className="mt-5 min-h-11 rounded-xl">
            <Link href="/processes">Return to processes</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
