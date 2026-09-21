"use client";

import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  CircleHelp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { provisionTenant } from "@/app/actions/process-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyClientProfile,
  profileCompleteness,
  type ClientProfile,
} from "@/lib/domain/client-profile";

const steps = [
  ["Company", "Who is this client?"],
  ["Business", "What kind of business is it?"],
  ["Operations", "Where and how does it operate?"],
  ["People", "Who leads the relationship?"],
  ["Context", "What does the business actually do?"],
  ["Priorities", "What needs to become less owner-dependent?"],
  ["Brand", "How should the portal feel?"],
  ["Sign-in", "How will people access it?"],
  ["First user", "Who will own setup?"],
  ["First process", "Where should governance begin?"],
] as const;

const sampleProfile: ClientProfile = {
  ...emptyClientProfile,
  legalName: "Northstar Services Limited",
  tradingName: "Northstar Services",
  website: "https://northstar.example",
  industry: "Professional services",
  businessModel: "B2B managed services",
  foundedYear: 2019,
  companySize: "11–50 people",
  headquarters: "Pune, Maharashtra, India",
  operatingLocations: "Pune and remote service teams",
  ownerName: "Nina Thomas",
  ownerTitle: "Founder",
  ownerEmail: "nina@northstar.example",
  primaryContactName: "Nina Thomas",
  primaryContactTitle: "Founder",
  primaryContactEmail: "nina@northstar.example",
  productsServices: "Managed customer service and implementation support.",
  customerTypes: "Small and mid-sized business clients.",
  systemsUsed: "Microsoft 365 and a service desk.",
  communicationChannels: "Microsoft Teams and email.",
  operationalChallenges: "Customer handoffs are inconsistent.",
  businessGoals: "Make service ownership visible and reduce founder chasing.",
  ownerDependencies: "Complex escalations wait for the founder.",
  complianceRequirements: "Customer data handling requirements.",
  decisionMakingStyle: "Collaborative, with founder review for exceptions.",
  seasonality: "No material seasonality.",
};

export function TenantWizard({
  initialSample = false,
  tenantPortalHost,
}: {
  initialSample?: boolean;
  tenantPortalHost: string;
}) {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState(
    initialSample ? "Northstar Services" : "",
  );
  const [slug, setSlug] = useState(initialSample ? "northstar" : "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>(
    initialSample ? sampleProfile : emptyClientProfile,
  );
  const [departmentsText, setDepartmentsText] = useState(
    initialSample
      ? "Operations, Sales, Finance, Service"
      : "Operations, Finance, Sales",
  );
  const [primary, setPrimary] = useState("#145e66");
  const [accent, setAccent] = useState("#8bd3c7");
  const google = true;
  const [inviteEmail, setInviteEmail] = useState(
    initialSample ? "guardian@northstar.example" : "",
  );
  const [inviteRoles, setInviteRoles] = useState([
    "TENANT_ADMIN",
    "PROCESS_GUARDIAN",
  ]);
  const [accessScope, setAccessScope] = useState<"EVERYONE" | "RESTRICTED">(
    "EVERYONE",
  );
  const [firstProcess, setFirstProcess] = useState(
    initialSample ? "Customer enquiry handoff" : "",
  );
  const [firstProcessDepartment, setFirstProcessDepartment] =
    useState("Operations");
  const [saved, setSaved] = useState("Saved just now");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const departments = useMemo(
    () =>
      departmentsText
        .split(/,|\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    [departmentsText],
  );

  const updateProfile = <Key extends keyof ClientProfile>(
    key: Key,
    value: ClientProfile[Key],
  ) => setProfile((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const savingTimeout = window.setTimeout(() => setSaved("Saving…"), 0);
    const timeout = window.setTimeout(() => {
      localStorage.setItem(
        "emilda:tenant-onboarding-draft",
        JSON.stringify({
          step,
          company,
          slug,
          profile,
          departmentsText,
          primary,
          accent,
          google,
          inviteEmail,
          inviteRoles,
          accessScope,
          firstProcess,
          firstProcessDepartment,
        }),
      );
      setSaved("Saved just now");
    }, 600);
    return () => {
      window.clearTimeout(savingTimeout);
      window.clearTimeout(timeout);
    };
  }, [
    accent,
    accessScope,
    company,
    departmentsText,
    firstProcess,
    firstProcessDepartment,
    google,
    inviteEmail,
    inviteRoles,
    primary,
    profile,
    slug,
    step,
  ]);

  const valid = [
    company.trim().length >= 2 && String(profile.legalName).trim().length >= 2,
    Boolean(profile.industry && profile.businessModel && profile.companySize),
    Boolean(slug && profile.headquarters && departments.length),
    Boolean(profile.ownerName && profile.primaryContactName),
    Boolean(profile.productsServices && profile.customerTypes),
    Boolean(
      profile.operationalChallenges &&
        profile.businessGoals &&
        profile.ownerDependencies,
    ),
    Boolean(primary && accent),
    google,
    Boolean(inviteEmail && inviteRoles.length),
    Boolean(
      firstProcess &&
        firstProcessDepartment &&
        departments.includes(firstProcessDepartment) &&
        accessScope,
    ),
  ][step];

  const createTenant = async () => {
    setSubmitting(true);
    const input = {
      name: company,
      slug,
      primary,
      accent,
      google,
      microsoft: false,
      inviteEmail,
      inviteRoles,
      accessScope,
      firstProcess,
      firstProcessDepartment,
      departments,
      profile: { ...profile, tradingName: profile.tradingName || company },
    };
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      localStorage.setItem(`emilda:tenant:${slug}`, JSON.stringify(input));
      localStorage.removeItem("emilda:tenant-onboarding-draft");
      toast.success(`${company} created with a complete client profile`);
      router.push("/admin/tenants");
      return;
    }
    const result = await provisionTenant(input);
    setSubmitting(false);
    if (!result.ok) return toast.error(result.error);
    localStorage.removeItem("emilda:tenant-onboarding-draft");
    toast.success(`${company} created with a complete client profile`);
    router.push("/admin/tenants");
  };

  return (
    <div>
      <div className="flex justify-between gap-3 text-sm">
        <span>
          {step + 1} of {steps.length} · {steps[step][0]}
        </span>
        <span className="text-muted-foreground" aria-live="polite">
          {saved}
        </span>
      </div>
      <Progress
        value={((step + 1) / steps.length) * 100}
        aria-label="Tenant setup completion"
        className="mt-3 h-2"
      />

      <div className="mt-7 rounded-2xl border bg-white p-5 sm:p-7">
        <p className="eyebrow">{steps[step][0]}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--navy)]">
          {steps[step][1]}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This context helps Guardians design realistic processes. A Tenant
          Admin can amend it later from Client profile.
        </p>

        <div className="mt-6">
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Client/company name" htmlFor="company">
                <Input
                  id="company"
                  value={company}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCompany(value);
                    updateProfile("tradingName", value);
                    if (!slugEdited) {
                      setSlug(
                        value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                          .slice(0, 63),
                      );
                    }
                  }}
                  className="h-12"
                />
              </Field>
              <Field label="Legal name" htmlFor="legal-name">
                <Input
                  id="legal-name"
                  value={profile.legalName}
                  onChange={(event) =>
                    updateProfile("legalName", event.target.value)
                  }
                  className="h-12"
                />
              </Field>
              <Field label="Website" htmlFor="website">
                <Input
                  id="website"
                  type="url"
                  value={profile.website}
                  onChange={(event) =>
                    updateProfile("website", event.target.value)
                  }
                  placeholder="https://company.com"
                  className="h-12"
                />
              </Field>
              <Field label="Founded year" htmlFor="founded-year">
                <Input
                  id="founded-year"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={profile.foundedYear}
                  onChange={(event) =>
                    updateProfile(
                      "foundedYear",
                      event.target.value ? Number(event.target.value) : "",
                    )
                  }
                  className="h-12"
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Industry" htmlFor="industry">
                <Input
                  id="industry"
                  value={profile.industry}
                  onChange={(event) =>
                    updateProfile("industry", event.target.value)
                  }
                  placeholder="For example: construction"
                  className="h-12"
                />
              </Field>
              <Field label="Business model" htmlFor="business-model">
                <Input
                  id="business-model"
                  value={profile.businessModel}
                  onChange={(event) =>
                    updateProfile("businessModel", event.target.value)
                  }
                  placeholder="For example: B2B services"
                  className="h-12"
                />
              </Field>
              <Field label="Company size" htmlFor="company-size">
                <select
                  id="company-size"
                  value={profile.companySize}
                  onChange={(event) =>
                    updateProfile("companySize", event.target.value)
                  }
                  className="h-12 w-full rounded-xl border bg-white px-3 text-sm"
                >
                  <option value="">Choose a range</option>
                  {[
                    "1–10 people",
                    "11–50 people",
                    "51–100 people",
                    "101–250 people",
                    "251+ people",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Trading name" htmlFor="trading-name">
                <Input
                  id="trading-name"
                  value={profile.tradingName}
                  onChange={(event) =>
                    updateProfile("tradingName", event.target.value)
                  }
                  className="h-12"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Tenant URL" htmlFor="tenant-slug">
                <div className="flex items-center rounded-xl border bg-white focus-within:ring-2 focus-within:ring-ring">
                  <Input
                    id="tenant-slug"
                    value={slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      setSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      );
                    }}
                    className="h-12 border-0 shadow-none focus-visible:ring-0"
                  />
                  <span className="pr-3 text-xs text-muted-foreground">
                    {tenantPortalHost}/…
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Portal: {tenantPortalHost}/{slug || "client-name"}
                </p>
              </Field>
              <Field label="Headquarters" htmlFor="headquarters">
                <Input
                  id="headquarters"
                  value={profile.headquarters}
                  onChange={(event) =>
                    updateProfile("headquarters", event.target.value)
                  }
                  placeholder="City, state, country"
                  className="h-12"
                />
              </Field>
              <Field label="Operating locations" htmlFor="locations">
                <Input
                  id="locations"
                  value={profile.operatingLocations}
                  onChange={(event) =>
                    updateProfile("operatingLocations", event.target.value)
                  }
                  className="h-12"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Timezone" htmlFor="timezone">
                  <Input
                    id="timezone"
                    value={profile.timezone}
                    onChange={(event) =>
                      updateProfile("timezone", event.target.value)
                    }
                    className="h-12"
                  />
                </Field>
                <Field label="Currency" htmlFor="currency">
                  <Input
                    id="currency"
                    value={profile.currency}
                    maxLength={3}
                    onChange={(event) =>
                      updateProfile(
                        "currency",
                        event.target.value.toUpperCase(),
                      )
                    }
                    className="h-12"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Departments" htmlFor="departments">
                  <Input
                    id="departments"
                    value={departmentsText}
                    onChange={(event) => setDepartmentsText(event.target.value)}
                    placeholder="Operations, Sales, Finance"
                    className="h-12"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Processes will be grouped using these departments.
                  </p>
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <PersonFields
                heading="Business owner"
                prefix="owner"
                name={profile.ownerName}
                title={profile.ownerTitle}
                email={profile.ownerEmail}
                phone={profile.ownerPhone}
                onChange={updateProfile}
              />
              <div className="border-t pt-6">
                <PersonFields
                  heading="Primary Emilda contact"
                  prefix="primaryContact"
                  name={profile.primaryContactName}
                  title={profile.primaryContactTitle}
                  email={profile.primaryContactEmail}
                  phone={profile.primaryContactPhone}
                  onChange={updateProfile}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-5">
              <LongField
                id="products-services"
                label="Products and services"
                value={profile.productsServices}
                onChange={(value) => updateProfile("productsServices", value)}
                placeholder="What does the client sell or deliver?"
              />
              <LongField
                id="customer-types"
                label="Main customer types"
                value={profile.customerTypes}
                onChange={(value) => updateProfile("customerTypes", value)}
                placeholder="Who depends on these processes?"
              />
              <LongField
                id="systems-used"
                label="Systems and tools already used"
                value={profile.systemsUsed}
                onChange={(value) => updateProfile("systemsUsed", value)}
                placeholder="ERP, spreadsheets, WhatsApp, email, paper…"
              />
              <LongField
                id="communication-channels"
                label="How people communicate"
                value={profile.communicationChannels}
                onChange={(value) =>
                  updateProfile("communicationChannels", value)
                }
              />
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-5">
              <LongField
                id="operational-challenges"
                label="Main operational challenges"
                value={profile.operationalChallenges}
                onChange={(value) =>
                  updateProfile("operationalChallenges", value)
                }
                placeholder="Where is work unreliable or hard to see?"
              />
              <LongField
                id="business-goals"
                label="Business goals for the next 12 months"
                value={profile.businessGoals}
                onChange={(value) => updateProfile("businessGoals", value)}
              />
              <LongField
                id="owner-dependencies"
                label="Where is the owner still being chased?"
                value={profile.ownerDependencies}
                onChange={(value) => updateProfile("ownerDependencies", value)}
              />
              <LongField
                id="compliance"
                label="Important compliance or contractual requirements"
                value={profile.complianceRequirements}
                onChange={(value) =>
                  updateProfile("complianceRequirements", value)
                }
              />
              <details className="rounded-xl border bg-muted/20 p-4">
                <summary className="cursor-pointer font-medium">
                  Add deeper context (optional)
                </summary>
                <div className="mt-5 grid gap-5">
                  <LongField
                    id="decision-style"
                    label="Decision-making style"
                    value={profile.decisionMakingStyle}
                    onChange={(value) =>
                      updateProfile("decisionMakingStyle", value)
                    }
                  />
                  <LongField
                    id="seasonality"
                    label="Seasonality or peak periods"
                    value={profile.seasonality}
                    onChange={(value) => updateProfile("seasonality", value)}
                  />
                  <LongField
                    id="client-notes"
                    label="Other useful context"
                    value={profile.notes}
                    onChange={(value) => updateProfile("notes", value)}
                  />
                </div>
              </details>
            </div>
          )}

          {step === 6 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Primary brand color" htmlFor="primary-color">
                <Input
                  id="primary-color"
                  type="color"
                  value={primary}
                  onChange={(event) => setPrimary(event.target.value)}
                  className="h-14 p-2"
                />
              </Field>
              <Field label="Accent color" htmlFor="accent-color">
                <Input
                  id="accent-color"
                  type="color"
                  value={accent}
                  onChange={(event) => setAccent(event.target.value)}
                  className="h-14 p-2"
                />
              </Field>
              <div
                className="rounded-xl p-5 text-white sm:col-span-2"
                style={{ backgroundColor: primary }}
              >
                <span className="text-xs font-medium opacity-80">
                  Portal preview
                </span>
                <p className="mt-1 text-xl font-semibold">{company}</p>
              </div>
            </div>
          )}

          {step === 7 && (
            <fieldset>
              <legend className="font-semibold">Client sign-in</legend>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3 font-semibold text-emerald-950">
                  <Check className="size-5" /> Google Workspace
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  Users sign in with the Google account matching their
                  invitation. Password and Microsoft sign-in are disabled in
                  production.
                </p>
              </div>
            </fieldset>
          )}

          {step === 8 && (
            <div>
              <Field label="First user email" htmlFor="invite-email">
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="h-12"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  The invitation expires in seven days.
                </p>
              </Field>
              <fieldset className="mt-6">
                <legend className="font-semibold">Initial roles</legend>
                <div className="mt-4 space-y-3">
                  {[
                    ["TENANT_ADMIN", "Tenant Admin"],
                    ["PROCESS_GUARDIAN", "Process Guardian"],
                  ].map(([role, label]) => (
                    <CheckField
                      key={role}
                      label={label}
                      checked={inviteRoles.includes(role)}
                      onChange={(checked) =>
                        setInviteRoles((current) =>
                          checked
                            ? [...current, role]
                            : current.filter((item) => item !== role),
                        )
                      }
                    />
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-6">
              <Field label="First process name" htmlFor="first-process">
                <Input
                  id="first-process"
                  value={firstProcess}
                  onChange={(event) => setFirstProcess(event.target.value)}
                  className="h-12"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  A version 1.0 draft is created so the Guardian can continue
                  immediately.
                </p>
              </Field>
              <Field
                label="First process department"
                htmlFor="first-process-department"
              >
                <select
                  id="first-process-department"
                  value={firstProcessDepartment}
                  onChange={(event) =>
                    setFirstProcessDepartment(event.target.value)
                  }
                  className="h-12 w-full rounded-xl border bg-white px-3 text-sm"
                >
                  {!departments.includes(firstProcessDepartment) && (
                    <option value="">Choose a department</option>
                  )}
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-muted-foreground">
                  This controls where the process appears in the library.
                </p>
              </Field>
              <fieldset>
                <legend className="font-semibold">
                  First process visibility
                </legend>
                <div className="mt-3 space-y-3">
                  {(
                    [
                      { value: "EVERYONE", label: "Everyone in the tenant" },
                      {
                        value: "RESTRICTED",
                        label: "Restricted until access is assigned",
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className="flex min-h-12 items-center gap-3 rounded-xl border p-3"
                    >
                      <input
                        type="radio"
                        name="access"
                        checked={accessScope === option.value}
                        onChange={() => setAccessScope(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <div className="flex items-center gap-2 font-semibold">
                  <Building2 className="size-4" />
                  Client profile {profileCompleteness(profile)}% ready
                </div>
                <p className="mt-1 leading-6">
                  {departments.length} departments · business context captured ·
                  owner and primary contact recorded
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="min-h-12 rounded-xl"
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft />
            Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button
            size="lg"
            className="min-h-12 flex-1 rounded-xl"
            disabled={!valid}
            onClick={() => setStep(step + 1)}
          >
            Continue
            <ArrowRight />
          </Button>
        ) : (
          <Button
            size="lg"
            className="min-h-12 flex-1 rounded-xl"
            disabled={!valid || submitting}
            onClick={createTenant}
          >
            <Check />
            {submitting ? "Creating tenant…" : "Create tenant"}
          </Button>
        )}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <CircleHelp className="mt-0.5 size-4 shrink-0" />
        Nothing here is permanent. Tenant Admins can amend the client profile,
        departments, branding, people, and access later.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-2 block">
        {label}
      </Label>
      {children}
    </div>
  );
}

function LongField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 rounded-xl"
      />
    </Field>
  );
}

function PersonFields({
  heading,
  prefix,
  name,
  title,
  email,
  phone,
  onChange,
}: {
  heading: string;
  prefix: "owner" | "primaryContact";
  name: string | number;
  title: string | number;
  email: string | number;
  phone: string | number;
  onChange: <Key extends keyof ClientProfile>(
    key: Key,
    value: ClientProfile[Key],
  ) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold">{heading}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${prefix}-name`}>
          <Input
            id={`${prefix}-name`}
            value={name}
            onChange={(event) =>
              onChange(
                prefix === "owner" ? "ownerName" : "primaryContactName",
                event.target.value,
              )
            }
            className="h-12"
          />
        </Field>
        <Field label="Role / title" htmlFor={`${prefix}-title`}>
          <Input
            id={`${prefix}-title`}
            value={title}
            onChange={(event) =>
              onChange(
                prefix === "owner" ? "ownerTitle" : "primaryContactTitle",
                event.target.value,
              )
            }
            className="h-12"
          />
        </Field>
        <Field label="Email" htmlFor={`${prefix}-email`}>
          <Input
            id={`${prefix}-email`}
            type="email"
            value={email}
            onChange={(event) =>
              onChange(
                prefix === "owner" ? "ownerEmail" : "primaryContactEmail",
                event.target.value,
              )
            }
            className="h-12"
          />
        </Field>
        <Field label="Phone" htmlFor={`${prefix}-phone`}>
          <Input
            id={`${prefix}-phone`}
            type="tel"
            value={phone}
            onChange={(event) =>
              onChange(
                prefix === "owner" ? "ownerPhone" : "primaryContactPhone",
                event.target.value,
              )
            }
            className="h-12"
          />
        </Field>
      </div>
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
