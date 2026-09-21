import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import {
  acmeClientProfile,
  emptyClientProfile,
  type ClientProfile,
} from "@/lib/domain/client-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientProfileEditor } from "./profile-editor";

function fromDatabase(row: Record<string, unknown> | null): ClientProfile {
  if (!row) return emptyClientProfile;
  return {
    legalName: String(row.legal_name ?? ""),
    tradingName: String(row.trading_name ?? ""),
    website: String(row.website ?? ""),
    industry: String(row.industry ?? ""),
    businessModel: String(row.business_model ?? ""),
    foundedYear: row.founded_year ? Number(row.founded_year) : "",
    companySize: String(row.company_size ?? ""),
    headquarters: String(row.headquarters ?? ""),
    operatingLocations: String(row.operating_locations ?? ""),
    timezone: String(row.timezone ?? "Asia/Kolkata"),
    currency: String(row.default_currency ?? "INR"),
    ownerName: String(row.owner_name ?? ""),
    ownerTitle: String(row.owner_title ?? ""),
    ownerEmail: String(row.owner_email ?? ""),
    ownerPhone: String(row.owner_phone ?? ""),
    primaryContactName: String(row.primary_contact_name ?? ""),
    primaryContactTitle: String(row.primary_contact_title ?? ""),
    primaryContactEmail: String(row.primary_contact_email ?? ""),
    primaryContactPhone: String(row.primary_contact_phone ?? ""),
    productsServices: String(row.products_services ?? ""),
    customerTypes: String(row.customer_types ?? ""),
    systemsUsed: String(row.systems_used ?? ""),
    communicationChannels: String(row.communication_channels ?? ""),
    operationalChallenges: String(row.operational_challenges ?? ""),
    businessGoals: String(row.business_goals ?? ""),
    ownerDependencies: String(row.owner_dependencies ?? ""),
    complianceRequirements: String(row.compliance_requirements ?? ""),
    decisionMakingStyle: String(row.decision_making_style ?? ""),
    seasonality: String(row.seasonality ?? ""),
    notes: String(row.notes ?? ""),
  };
}

export default async function ClientProfilePage() {
  const requestHeaders = await headers();
  const tenantSlug = requestHeaders.get("x-tenant-slug") ?? "acme";
  const supabase = await createSupabaseServerClient();
  let profile = tenantSlug === "acme" ? acmeClientProfile : emptyClientProfile;
  let departments =
    tenantSlug === "acme"
      ? ["Operations", "Finance", "Fulfilment", "Sales"]
      : ["Operations"];

  if (supabase) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, timezone")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (tenant) {
      const [{ data: profileRow }, { data: departmentRows }] =
        await Promise.all([
          supabase
            .from("tenant_profiles")
            .select("*")
            .eq("tenant_id", tenant.id)
            .maybeSingle(),
          supabase
            .from("departments")
            .select("name")
            .eq("tenant_id", tenant.id)
            .order("name"),
        ]);
      profile = fromDatabase(
        profileRow
          ? { ...profileRow, timezone: tenant.timezone }
          : { timezone: tenant.timezone },
      );
      departments = departmentRows?.map((item) => item.name) ?? departments;
    }
  }

  return (
    <AppShell
      title="Client profile"
      description="The business context Emilda uses to design practical processes and better starting drafts."
    >
      <ClientProfileEditor
        initialProfile={profile}
        initialDepartments={departments}
      />
    </AppShell>
  );
}
