"use client";

import { Check, Copy, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inviteTenantUser } from "@/app/actions/process-actions";
import { useTenantTheme } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TenantMemberView = {
  id: string;
  userId: string;
  name: string;
  email: string;
  provider: string;
  roles: string[];
  status: string;
};

export type TenantInvitationView = {
  id: string;
  email: string;
  roles: string[];
  expiresAt: string;
};

const roles = [
  ["TENANT_ADMIN", "Tenant Admin"],
  ["PROCESS_GUARDIAN", "Process Guardian"],
  ["PROCESS_OWNER", "Process Owner"],
  ["CONTRIBUTOR", "Contributor"],
  ["APPROVER", "Approver"],
  ["VIEWER", "Viewer"],
  ["AUDITOR", "Auditor"],
] as const;

export function UserManagement({
  members,
  invitations,
  canInvite,
}: {
  members: TenantMemberView[];
  invitations: TenantInvitationView[];
  canInvite: boolean;
}) {
  const { localPrefix } = useTenantTheme();
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["VIEWER"]);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role: string) =>
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );

  const invite = async () => {
    setSubmitting(true);
    const result = await inviteTenantUser({ email, roles: selectedRoles });
    setSubmitting(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Google access created for this client");
    setEmail("");
    window.location.reload();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">People with access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {members.length} active{" "}
              {members.length === 1 ? "person" : "people"}
            </p>
          </div>
          <div className="divide-y">
            {members.map((member) => (
              <article key={member.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {member.email || "Google account pending profile sync"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      User ID · {member.userId}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full bg-emerald-50 text-emerald-800"
                  >
                    <Check /> Active
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.roles.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="rounded-full"
                    >
                      {roleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {invitations.length > 0 && (
          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold">
                Waiting for Google sign-in
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Access activates only when the matching Google account signs in.
              </p>
            </div>
            <div className="divide-y">
              {invitations.map((invitation) => (
                <article key={invitation.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800">
                      <Mail className="size-5" />
                    </span>
                    <div>
                      <h3 className="break-all font-semibold">
                        {invitation.email}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {invitation.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="rounded-full"
                          >
                            {roleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="h-fit rounded-2xl border bg-white p-5 lg:sticky lg:top-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,white)] text-[var(--brand-primary)]">
            <UserPlus className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Give someone access</h2>
            <p className="text-xs text-muted-foreground">Google account only</p>
          </div>
        </div>

        {canInvite ? (
          <>
            <div className="mt-5">
              <Label htmlFor="invite-google-email">Google email</Label>
              <Input
                id="invite-google-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="person@company.com"
                className="mt-2 h-12 rounded-xl"
              />
            </div>
            <fieldset className="mt-5">
              <legend className="text-sm font-medium">What can they do?</legend>
              <div className="mt-3 grid gap-2">
                {roles.map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(value)}
                      onChange={() => toggleRole(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              className="mt-5 min-h-12 w-full rounded-xl"
              disabled={!email || selectedRoles.length === 0 || submitting}
              onClick={invite}
            >
              <UserPlus />
              {submitting ? "Creating access…" : "Create Google access"}
            </Button>
            <Button
              variant="outline"
              className="mt-2 min-h-11 w-full rounded-xl"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `${window.location.origin}${localPrefix}/auth/login`,
                );
                toast.success("Client sign-in link copied");
              }}
            >
              <Copy /> Copy sign-in link
            </Button>
          </>
        ) : (
          <div className="mt-5 rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mb-2 size-5" />A Tenant Admin controls
            client access. You can still see your own user ID and assigned
            roles.
          </div>
        )}
      </aside>
    </div>
  );
}

function roleLabel(role: string) {
  return roles.find(([value]) => value === role)?.[1] ?? role;
}
