-- Platform administrators do not receive permanent tenant membership. They can
-- deliberately open a client for setup, which creates an audited four-hour
-- support grant. The grant is treated as Tenant Admin authority only while it is
-- active, and the tenant UI makes that temporary authority visible.

create or replace function private.has_active_support_access(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.support_access_grants grant_record
    where grant_record.tenant_id = p_tenant_id
      and grant_record.user_id = (select auth.uid())
      and grant_record.revoked_at is null
      and now() between grant_record.starts_at and grant_record.expires_at
  );
$$;

create or replace function private.has_tenant_role(
  p_tenant_id uuid,
  p_role public.membership_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    join public.membership_roles membership_role
      on membership_role.membership_id = membership.id
      and membership_role.tenant_id = membership.tenant_id
    join public.roles role_record
      on role_record.id = membership_role.role_id
      and role_record.tenant_id = membership_role.tenant_id
    where membership.tenant_id = p_tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'ACTIVE'
      and role_record.role = p_role
  ) or (
    p_role = 'TENANT_ADMIN'::public.membership_role
    and private.has_active_support_access(p_tenant_id)
  );
$$;

revoke all on function private.has_active_support_access(uuid)
  from public, anon, authenticated;
revoke all on function private.has_tenant_role(uuid, public.membership_role)
  from public, anon, authenticated;
grant execute on function private.has_active_support_access(uuid)
  to authenticated;
grant execute on function private.has_tenant_role(uuid, public.membership_role)
  to authenticated;

create or replace function public.open_platform_tenant(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_expires_at timestamptz;
  v_access_mode text := 'SUPPORT';
begin
  if auth.uid() is null or not exists (
    select 1
    from public.platform_admins administrator
    where administrator.user_id = auth.uid()
  ) then
    raise exception 'Platform administrator access required';
  end if;

  select tenant.id, tenant.slug, tenant.name
  into v_tenant
  from public.tenants tenant
  where tenant.id = p_tenant_id
    and tenant.deleted_at is null
    and tenant.status = 'ACTIVE';

  if v_tenant.id is null then
    raise exception 'Client tenant not found';
  end if;

  if exists (
    select 1
    from public.tenant_memberships membership
    join public.membership_roles membership_role
      on membership_role.tenant_id = membership.tenant_id
      and membership_role.membership_id = membership.id
    join public.roles role_record
      on role_record.tenant_id = membership_role.tenant_id
      and role_record.id = membership_role.role_id
    where membership.tenant_id = p_tenant_id
      and membership.user_id = auth.uid()
      and membership.status = 'ACTIVE'
      and role_record.role = 'TENANT_ADMIN'
  ) then
    v_access_mode := 'MEMBER';
  else
    select grant_record.expires_at
    into v_expires_at
    from public.support_access_grants grant_record
    where grant_record.tenant_id = p_tenant_id
      and grant_record.user_id = auth.uid()
      and grant_record.revoked_at is null
      and now() between grant_record.starts_at and grant_record.expires_at
    order by grant_record.expires_at desc
    limit 1;

    if v_expires_at is null then
      v_expires_at := now() + interval '4 hours';

      insert into public.support_access_grants (
        tenant_id,
        user_id,
        reason,
        expires_at
      ) values (
        p_tenant_id,
        auth.uid(),
        'Initial client setup from platform administration',
        v_expires_at
      );

      insert into public.activity_logs (
        tenant_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        p_tenant_id,
        auth.uid(),
        'SUPPORT_ACCESS_GRANTED',
        'TENANT',
        p_tenant_id,
        jsonb_build_object(
          'reason', 'Initial client setup from platform administration',
          'expires_at', v_expires_at
        )
      );
    end if;
  end if;

  return jsonb_build_object(
    'tenantId', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'accessMode', v_access_mode,
    'expiresAt', v_expires_at
  );
end;
$$;

revoke all on function public.open_platform_tenant(uuid)
  from public, anon;
grant execute on function public.open_platform_tenant(uuid)
  to authenticated;

create or replace function public.get_my_active_support_access(p_tenant_id uuid)
returns table (
  reason text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select grant_record.reason, grant_record.expires_at
  from public.support_access_grants grant_record
  where grant_record.tenant_id = p_tenant_id
    and grant_record.user_id = (select auth.uid())
    and grant_record.revoked_at is null
    and now() between grant_record.starts_at and grant_record.expires_at
  order by grant_record.expires_at desc
  limit 1;
$$;

revoke all on function public.get_my_active_support_access(uuid)
  from public, anon;
grant execute on function public.get_my_active_support_access(uuid)
  to authenticated;

comment on function public.open_platform_tenant(uuid) is
  'Creates or reuses an audited four-hour setup grant for the calling platform administrator.';
comment on function public.get_my_active_support_access(uuid) is
  'Returns only the calling user active support grant for the requested tenant.';
