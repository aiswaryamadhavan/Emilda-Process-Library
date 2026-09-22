import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { FocusShell } from "@/components/focus-shell";
import {
  canCreateProcesses,
  DEMO_USER_COOKIE,
} from "@/lib/allowed-users";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProcessStarter } from "./process-starter";

export default async function NewProcessPage() {
  const requestHeaders = await headers();
  const tenantPathPrefix = requestHeaders.get("x-tenant-path-prefix") ?? "";
  const tenantSlug = requestHeaders.get("x-tenant-slug") ?? "acme";
  const supabase = await createSupabaseServerClient();
  const demoEmail = (await cookies()).get(DEMO_USER_COOKIE)?.value;

  if (!supabase && !canCreateProcesses(demoEmail)) {
    redirect(`${tenantPathPrefix}/processes`);
  }

  let departments = ["Operations", "Finance", "Fulfilment", "Sales"];

  if (supabase) {
    const tenantId = requestHeaders.get("x-tenant-id");
    if (tenantId) {
      const { data } = await supabase
        .from("departments")
        .select("name")
        .eq("tenant_id", tenantId)
        .order("name");
      if (data?.length) departments = data.map(({ name }) => name);
    }
  }

  return (
    <FocusShell
      eyebrow="New process"
      title="Start with what you know"
      subtitle="Add the process details, templates and links, then attach the HTML map. Review everything before you save."
    >
      <ProcessStarter departments={departments} />
    </FocusShell>
  );
}
