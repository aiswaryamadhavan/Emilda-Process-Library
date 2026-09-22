import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  UserManagement,
  type TenantInvitationView,
  type TenantMemberView,
} from "./user-management";

export default async function UsersPage() {
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? "acme";
  const supabase = await createSupabaseServerClient();
  let members: TenantMemberView[] = [];
  let invitations: TenantInvitationView[] = [];
  let canInvite = true;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (!user || !tenant) notFound();

    const [membershipResult, roleResult, roleLinkResult, invitationResult] =
      await Promise.all([
        supabase
          .from("tenant_memberships")
          .select("id,user_id,status,created_at")
          .eq("tenant_id", tenant.id)
          .eq("status", "ACTIVE")
          .order("created_at"),
        supabase.from("roles").select("id,role").eq("tenant_id", tenant.id),
        supabase
          .from("membership_roles")
          .select("membership_id,role_id")
          .eq("tenant_id", tenant.id),
        supabase
          .from("tenant_invitations")
          .select("id,email,requested_roles,expires_at")
          .eq("tenant_id", tenant.id)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
      ]);

    const membershipRows = membershipResult.data ?? [];
    const profileIds = membershipRows.map((item) => item.user_id);
    const { data: profileRows } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id,display_name,email,auth_provider")
          .in("id", profileIds)
      : { data: [] };
    const profilesById = new Map(
      (profileRows ?? []).map((profile) => [profile.id, profile]),
    );
    const roleById = new Map(
      (roleResult.data ?? []).map((role) => [role.id, role.role]),
    );
    const rolesByMembership = new Map<string, string[]>();
    for (const link of roleLinkResult.data ?? []) {
      const role = roleById.get(link.role_id);
      if (!role) continue;
      rolesByMembership.set(link.membership_id, [
        ...(rolesByMembership.get(link.membership_id) ?? []),
        role,
      ]);
    }

    members = membershipRows.map((membership) => {
      const profile = profilesById.get(membership.user_id);
      return {
        id: membership.id,
        userId: membership.user_id,
        name: profile?.display_name ?? "Google user",
        email: profile?.email ?? "",
        provider: profile?.auth_provider ?? "google",
        roles: rolesByMembership.get(membership.id) ?? [],
        status: membership.status,
      };
    });
    invitations = (invitationResult.data ?? []).map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      roles: invitation.requested_roles,
      expiresAt: invitation.expires_at,
    }));
    const currentMembership = membershipRows.find(
      (membership) => membership.user_id === user.id,
    );
    canInvite = Boolean(
      currentMembership &&
        rolesByMembership.get(currentMembership.id)?.includes("TENANT_ADMIN"),
    );
  }

  return (
    <AppShell
      title="Users & roles"
      description="Admins create access and assign people only to the process libraries they need."
    >
      <UserManagement
        members={members}
        invitations={invitations}
        canInvite={canInvite}
      />
    </AppShell>
  );
}
