import { headers } from "next/headers";
import { FocusShell } from "@/components/focus-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProcessStarter } from "./process-starter";

export default async function NewProcessPage() {
  const requestHeaders = await headers();
  const tenantSlug = requestHeaders.get("x-tenant-slug") ?? "acme";
  const supabase = await createSupabaseServerClient();
  let departments =
    tenantSlug === "acme"
      ? ["Operations", "Finance", "Fulfilment", "Sales"]
      : ["Operations"];

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
      subtitle="Add the essential details, any useful templates, and the HTML process map. The uploaded map is saved as-is in the Process Library."
    >
      <ProcessStarter departments={departments} />
    </FocusShell>
  );
}
