"use client";

import { Check, ChevronLeft, ChevronRight, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateTenantProfile } from "@/app/actions/process-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useTenantTheme } from "@/components/tenant-provider";
import {
  profileCompleteness,
  type ClientProfile,
} from "@/lib/domain/client-profile";

const sections = ["Business", "People", "Operations", "Priorities"] as const;

export function ClientProfileEditor({
  initialProfile,
  initialDepartments,
}: {
  initialProfile: ClientProfile;
  initialDepartments: string[];
}) {
  const { slug } = useTenantTheme();
  const [section, setSection] = useState(0);
  const [profile, setProfile] = useState(initialProfile);
  const [departments, setDepartments] = useState(initialDepartments.join(", "));
  const [saving, setSaving] = useState(false);
  const update = <Key extends keyof ClientProfile>(
    key: Key,
    value: ClientProfile[Key],
  ) => setProfile((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    const departmentList = departments
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      localStorage.setItem(
        `emilda:client-profile:${slug}`,
        JSON.stringify({ profile, departments: departmentList }),
      );
      setSaving(false);
      toast.success("Client profile updated");
      return;
    }
    const result = await updateTenantProfile({
      profile,
      departments: departmentList,
    });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Client profile updated");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="surface-card h-fit p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Profile readiness</span>
          <span className="text-sm font-semibold text-[var(--brand-primary)]">
            {profileCompleteness(profile)}%
          </span>
        </div>
        <Progress
          className="mt-3 h-2"
          value={profileCompleteness(profile)}
          aria-label="Client profile completeness"
        />
        <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {sections.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(index)}
              className={`min-h-11 rounded-lg px-3 text-left text-sm font-medium ${
                section === index
                  ? "bg-[var(--brand-primary)] text-white"
                  : "hover:bg-muted"
              }`}
            >
              {index + 1}. {item}
            </button>
          ))}
        </nav>
        <p className="mt-5 flex gap-2 text-xs leading-5 text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          This context is included only when an authorized Guardian asks AI for
          a process starting draft.
        </p>
      </aside>

      <section className="surface-card p-5 sm:p-7">
        <p className="eyebrow">
          Section {section + 1} of {sections.length}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {sections[section]}
        </h2>

        {section === 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <ShortField
              id="legal-name"
              label="Legal name"
              value={profile.legalName}
              onChange={(value) => update("legalName", value)}
            />
            <ShortField
              id="trading-name"
              label="Trading name"
              value={profile.tradingName}
              onChange={(value) => update("tradingName", value)}
            />
            <ShortField
              id="industry"
              label="Industry"
              value={profile.industry}
              onChange={(value) => update("industry", value)}
            />
            <ShortField
              id="business-model"
              label="Business model"
              value={profile.businessModel}
              onChange={(value) => update("businessModel", value)}
            />
            <ShortField
              id="company-size"
              label="Company size"
              value={profile.companySize}
              onChange={(value) => update("companySize", value)}
            />
            <ShortField
              id="website"
              label="Website"
              value={profile.website}
              onChange={(value) => update("website", value)}
              type="url"
            />
            <ShortField
              id="headquarters"
              label="Headquarters"
              value={profile.headquarters}
              onChange={(value) => update("headquarters", value)}
            />
            <ShortField
              id="locations"
              label="Operating locations"
              value={profile.operatingLocations}
              onChange={(value) => update("operatingLocations", value)}
            />
          </div>
        )}

        {section === 1 && (
          <div className="mt-6 space-y-7">
            <Person
              heading="Business owner"
              name={profile.ownerName}
              title={profile.ownerTitle}
              email={profile.ownerEmail}
              phone={profile.ownerPhone}
              prefix="owner"
              update={update}
            />
            <div className="border-t pt-6">
              <Person
                heading="Primary Emilda contact"
                name={profile.primaryContactName}
                title={profile.primaryContactTitle}
                email={profile.primaryContactEmail}
                phone={profile.primaryContactPhone}
                prefix="primaryContact"
                update={update}
              />
            </div>
          </div>
        )}

        {section === 2 && (
          <div className="mt-6 grid gap-5">
            <LongField
              id="products"
              label="Products and services"
              value={profile.productsServices}
              onChange={(value) => update("productsServices", value)}
            />
            <LongField
              id="customers"
              label="Main customer types"
              value={profile.customerTypes}
              onChange={(value) => update("customerTypes", value)}
            />
            <LongField
              id="systems"
              label="Systems and tools"
              value={profile.systemsUsed}
              onChange={(value) => update("systemsUsed", value)}
            />
            <LongField
              id="channels"
              label="Communication channels"
              value={profile.communicationChannels}
              onChange={(value) => update("communicationChannels", value)}
            />
            <ShortField
              id="departments"
              label="Departments"
              value={departments}
              onChange={setDepartments}
            />
            <div className="grid grid-cols-2 gap-4">
              <ShortField
                id="timezone"
                label="Timezone"
                value={profile.timezone}
                onChange={(value) => update("timezone", value)}
              />
              <ShortField
                id="currency"
                label="Currency"
                value={profile.currency}
                onChange={(value) => update("currency", value.toUpperCase())}
              />
            </div>
          </div>
        )}

        {section === 3 && (
          <div className="mt-6 grid gap-5">
            <LongField
              id="challenges"
              label="Operational challenges"
              value={profile.operationalChallenges}
              onChange={(value) => update("operationalChallenges", value)}
            />
            <LongField
              id="goals"
              label="Business goals"
              value={profile.businessGoals}
              onChange={(value) => update("businessGoals", value)}
            />
            <LongField
              id="dependencies"
              label="Owner dependencies"
              value={profile.ownerDependencies}
              onChange={(value) => update("ownerDependencies", value)}
            />
            <LongField
              id="compliance"
              label="Compliance and contracts"
              value={profile.complianceRequirements}
              onChange={(value) => update("complianceRequirements", value)}
            />
            <LongField
              id="decisions"
              label="Decision-making style"
              value={profile.decisionMakingStyle}
              onChange={(value) => update("decisionMakingStyle", value)}
            />
            <LongField
              id="seasonality"
              label="Seasonality"
              value={profile.seasonality}
              onChange={(value) => update("seasonality", value)}
            />
            <LongField
              id="notes"
              label="Other useful context"
              value={profile.notes}
              onChange={(value) => update("notes", value)}
            />
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center">
          {section > 0 && (
            <Button variant="outline" onClick={() => setSection(section - 1)}>
              <ChevronLeft /> Previous
            </Button>
          )}
          <div className="sm:ml-auto flex gap-3">
            <Button variant="outline" onClick={save} disabled={saving}>
              {saving ? <Check /> : <Save />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {section < sections.length - 1 && (
              <Button onClick={() => setSection(section + 1)}>
                Next section <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ShortField({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 rounded-xl"
      />
    </div>
  );
}

function LongField(props: Omit<Parameters<typeof ShortField>[0], "type">) {
  return (
    <div>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Textarea
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="mt-2 min-h-24 rounded-xl"
      />
    </div>
  );
}

function Person({
  heading,
  name,
  title,
  email,
  phone,
  prefix,
  update,
}: {
  heading: string;
  name: string | number;
  title: string | number;
  email: string | number;
  phone: string | number;
  prefix: "owner" | "primaryContact";
  update: <Key extends keyof ClientProfile>(
    key: Key,
    value: ClientProfile[Key],
  ) => void;
}) {
  const key = (suffix: "Name" | "Title" | "Email" | "Phone") =>
    `${prefix}${suffix}` as keyof ClientProfile;
  return (
    <div>
      <h3 className="font-semibold">{heading}</h3>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <ShortField
          id={`${prefix}-name`}
          label="Name"
          value={name}
          onChange={(value) => update(key("Name"), value)}
        />
        <ShortField
          id={`${prefix}-title`}
          label="Role / title"
          value={title}
          onChange={(value) => update(key("Title"), value)}
        />
        <ShortField
          id={`${prefix}-email`}
          label="Email"
          value={email}
          type="email"
          onChange={(value) => update(key("Email"), value)}
        />
        <ShortField
          id={`${prefix}-phone`}
          label="Phone"
          value={phone}
          type="tel"
          onChange={(value) => update(key("Phone"), value)}
        />
      </div>
    </div>
  );
}
