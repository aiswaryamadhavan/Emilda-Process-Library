import { FocusShell } from "@/components/focus-shell";
import { TenantWizard } from "./tenant-wizard";

export default async function NewTenantPage({
  searchParams,
}: PageProps<"/admin/tenants/new">) {
  const query = await searchParams;
  return (
    <FocusShell
      eyebrow="Emilda Super Admin"
      title="Create client tenant"
      subtitle="Understand the client first, then set up branding, access, people, departments, and the first process."
    >
      <TenantWizard
        initialSample={query.sample === "1"}
        tenantPortalHost={process.env.TENANT_PATH_HOST ?? "gov.emilda.co"}
      />
    </FocusShell>
  );
}
