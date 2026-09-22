import Link from "next/link";
import { headers } from "next/headers";
import { ArrowUpRight, Building2, Plus } from "lucide-react";
import { openPlatformTenant } from "@/app/actions/process-actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { platformNavPrefix } from "@/lib/tenant";

type TenantSummary = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  primary_color: string;
  user_count: number;
  process_count: number;
  created_at: string;
};

const demoTenants: TenantSummary[] = [];

export default async function TenantsPage() {
  const supabase = await createSupabaseServerClient();
  const tenantPortalHost = process.env.TENANT_PATH_HOST ?? "gov.emilda.co";
  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const platformTenantPrefix = platformNavPrefix(
    requestHost,
    process.env.DEFAULT_TENANT_SLUG ?? "emilda-co",
    process.env.ROOT_DOMAIN,
    tenantPortalHost,
  );
  let tenants: TenantSummary[] = [];
  if (supabase) {
    const { data } = await supabase.rpc("list_platform_tenants");
    tenants = (data ?? []) as TenantSummary[];
  }

  return (
    <AppShell
      mode="platform"
      platformTenantPrefix={platformTenantPrefix}
      title="Client tenants"
      description="One deployment with strictly isolated client data."
      action={
        <Button asChild>
          <Link href="/admin/tenants/new">
            <Plus />
            New tenant
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4">
        {tenants.length === 0 && (
          <Card className="border-dashed bg-white shadow-none">
            <CardContent className="grid min-h-64 place-items-center p-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                  <Building2 className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">No clients yet</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start with one client. Emilda will collect the business
                  context, create their secure portal, invite the first user,
                  and prepare an editable first process.
                </p>
                <Button asChild className="mt-5 min-h-11">
                  <Link href="/admin/tenants/new">
                    <Plus />
                    Add your first client
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {tenants.map((tenant) => (
          <Tenant
            key={tenant.tenant_id}
            id={tenant.tenant_id}
            name={tenant.tenant_name}
            slug={tenant.tenant_slug}
            color={tenant.primary_color}
            users={tenant.user_count}
            processes={tenant.process_count}
            status={tenant.tenant_status}
            portalHost={tenantPortalHost}
          />
        ))}
      </div>
    </AppShell>
  );
}
function Tenant({
  id,
  name,
  slug,
  color,
  users,
  processes,
  status,
  portalHost,
}: {
  id: string;
  name: string;
  slug: string;
  color: string;
  users: number;
  processes: number;
  status: string;
  portalHost: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span
          className="grid size-12 place-items-center rounded-xl font-semibold text-white"
          style={{ background: color }}
        >
          {name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Client portal ·{" "}
            {users === 0
              ? "Invitation pending"
              : `${users} active ${users === 1 ? "user" : "users"}`}{" "}
            · {processes} {processes === 1 ? "process" : "processes"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {portalHost}/{slug}
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800">
            {status === "ACTIVE" ? "Active" : status}
          </Badge>
          <form action={openPlatformTenant}>
            <input type="hidden" name="tenantId" value={id} />
            <Button type="submit" className="min-h-11 rounded-xl">
              Open for setup
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
