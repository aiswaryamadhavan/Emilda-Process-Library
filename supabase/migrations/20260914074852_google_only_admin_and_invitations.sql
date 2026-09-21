alter table public.profiles
  add column email text,
  add column auth_provider text,
  add column last_sign_in_at timestamptz;

create unique index profiles_email_lower_idx
  on public.profiles (lower(email))
  where email is not null;

create table private.platform_admin_allowlist (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

revoke all on private.platform_admin_allowlist from public, anon, authenticated;

insert into private.platform_admin_allowlist (email)
values
  ('asiwarya@emildasolutions.com'),
  ('paul@emildasolutions.com');

alter table public.tenant_auth_settings
  alter column google_enabled set default true,
  alter column microsoft_enabled set default false,
  alter column email_enabled set default false;

update public.tenant_auth_settings
set google_enabled = true,
  microsoft_enabled = false,
  email_enabled = false,
  updated_at = now();

create or replace function private.enforce_google_only_tenant_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.google_enabled := true;
  new.microsoft_enabled := false;
  new.email_enabled := false;
  return new;
end;
$$;

revoke all on function private.enforce_google_only_tenant_auth() from public, anon, authenticated;

drop trigger if exists enforce_google_only_tenant_auth on public.tenant_auth_settings;
create trigger enforce_google_only_tenant_auth
  before insert or update on public.tenant_auth_settings
  for each row execute function private.enforce_google_only_tenant_auth();

create or replace function private.sync_google_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', '');
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'Emilda user'), '@', 1)
  );

  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    email,
    auth_provider,
    last_sign_in_at,
    updated_at
  ) values (
    new.id,
    v_display_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    lower(new.email),
    v_provider,
    new.last_sign_in_at,
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    email = excluded.email,
    auth_provider = excluded.auth_provider,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();

  if new.email_confirmed_at is not null
    and (
      v_provider = 'google'
      or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
    )
    and exists (
      select 1
      from private.platform_admin_allowlist allowlist
      where allowlist.email = lower(new.email)
    )
  then
    insert into public.platform_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_google_auth_profile() from public, anon, authenticated;

drop trigger if exists sync_google_auth_profile on auth.users;
create trigger sync_google_auth_profile
  after insert or update of email, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, last_sign_in_at
  on auth.users
  for each row execute function private.sync_google_auth_profile();

insert into public.profiles (
  id,
  display_name,
  avatar_url,
  email,
  auth_provider,
  last_sign_in_at
)
select
  user_record.id,
  coalesce(
    nullif(trim(user_record.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(user_record.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(user_record.email, 'Emilda user'), '@', 1)
  ),
  nullif(user_record.raw_user_meta_data ->> 'avatar_url', ''),
  lower(user_record.email),
  user_record.raw_app_meta_data ->> 'provider',
  user_record.last_sign_in_at
from auth.users user_record
on conflict (id) do update set
  email = excluded.email,
  auth_provider = excluded.auth_provider,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = now();

insert into public.platform_admins (user_id)
select user_record.id
from auth.users user_record
join private.platform_admin_allowlist allowlist
  on allowlist.email = lower(user_record.email)
where user_record.email_confirmed_at is not null
  and (
    user_record.raw_app_meta_data ->> 'provider' = 'google'
    or coalesce(user_record.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  )
on conflict (user_id) do nothing;

create policy profiles_tenant_directory_select
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tenant_memberships subject_membership
      join public.tenant_memberships actor_membership
        on actor_membership.tenant_id = subject_membership.tenant_id
       and actor_membership.user_id = (select auth.uid())
       and actor_membership.status = 'ACTIVE'
      where subject_membership.user_id = profiles.id
        and subject_membership.status = 'ACTIVE'
        and private.has_tenant_role(
          subject_membership.tenant_id,
          'TENANT_ADMIN'
        )
    )
  );

create policy platform_admins_self_select
  on public.platform_admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.accept_my_tenant_invitations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_provider text;
  v_membership_id uuid;
  v_invitation record;
  v_tenants jsonb := '[]'::jsonb;
begin
  select
    lower(email),
    coalesce(raw_app_meta_data ->> 'provider', '')
  into v_email, v_provider
  from auth.users
  where id = auth.uid()
    and email_confirmed_at is not null;

  if v_email is null then
    raise exception 'A verified Google account is required';
  end if;
  if v_provider <> 'google' and not exists (
    select 1
    from auth.users
    where id = auth.uid()
      and coalesce(raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  ) then
    raise exception 'Google sign-in is required';
  end if;

  for v_invitation in
    select invitation.id, invitation.tenant_id, invitation.requested_roles,
      tenant.slug, tenant.name
    from public.tenant_invitations invitation
    join public.tenants tenant on tenant.id = invitation.tenant_id
    where lower(invitation.email) = v_email
      and invitation.accepted_at is null
      and invitation.expires_at > now()
      and tenant.deleted_at is null
      and tenant.status = 'ACTIVE'
    for update of invitation
  loop
    insert into public.tenant_memberships (
      tenant_id,
      user_id,
      status,
      removed_at
    ) values (
      v_invitation.tenant_id,
      auth.uid(),
      'ACTIVE',
      null
    )
    on conflict (tenant_id, user_id) do update set
      status = 'ACTIVE',
      removed_at = null
    returning id into v_membership_id;

    insert into public.membership_roles (tenant_id, membership_id, role_id)
    select v_invitation.tenant_id, v_membership_id, role_record.id
    from public.roles role_record
    where role_record.tenant_id = v_invitation.tenant_id
      and role_record.role = any(v_invitation.requested_roles)
    on conflict (membership_id, role_id) do nothing;

    update public.tenant_invitations
    set accepted_at = now()
    where id = v_invitation.id;

    insert into public.activity_logs (
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      v_invitation.tenant_id,
      auth.uid(),
      'TENANT_INVITATION_ACCEPTED',
      'TENANT_MEMBERSHIP',
      v_membership_id,
      jsonb_build_object('email', v_email)
    );

    v_tenants := v_tenants || jsonb_build_array(
      jsonb_build_object(
        'id', v_invitation.tenant_id,
        'slug', v_invitation.slug,
        'name', v_invitation.name
      )
    );
  end loop;

  return v_tenants;
end;
$$;

revoke all on function public.accept_my_tenant_invitations() from public, anon;
grant execute on function public.accept_my_tenant_invitations() to authenticated;

create or replace function public.invite_tenant_user(
  p_tenant_id uuid,
  p_email text,
  p_roles public.membership_role[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation_id uuid;
  v_email text := lower(trim(p_email));
begin
  if not (
    exists (
      select 1 from public.platform_admins where user_id = auth.uid()
    )
    or private.has_tenant_role(p_tenant_id, 'TENANT_ADMIN')
  ) then
    raise exception 'Tenant administrator access required';
  end if;
  if not exists (
    select 1 from public.tenants
    where id = p_tenant_id and status = 'ACTIVE' and deleted_at is null
  ) then
    raise exception 'Tenant not found';
  end if;
  if v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or coalesce(array_length(p_roles, 1), 0) = 0
  then
    raise exception 'A valid email and at least one role are required';
  end if;

  select invitation.id into v_invitation_id
  from public.tenant_invitations invitation
  where invitation.tenant_id = p_tenant_id
    and lower(invitation.email) = v_email
    and invitation.accepted_at is null
  order by invitation.created_at desc
  limit 1
  for update;

  if v_invitation_id is null then
    insert into public.tenant_invitations (
      tenant_id,
      email,
      invited_by,
      token_hash,
      requested_roles,
      expires_at
    ) values (
      p_tenant_id,
      v_email,
      auth.uid(),
      encode(extensions.digest(gen_random_uuid()::text, 'sha256'), 'hex'),
      p_roles,
      now() + interval '7 days'
    )
    returning id into v_invitation_id;
  else
    update public.tenant_invitations
    set requested_roles = p_roles,
      expires_at = now() + interval '7 days'
    where id = v_invitation_id;
  end if;

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
    'TENANT_USER_INVITED',
    'TENANT_INVITATION',
    v_invitation_id,
    jsonb_build_object('email', v_email, 'roles', to_jsonb(p_roles))
  );

  return v_invitation_id;
end;
$$;

revoke all on function public.invite_tenant_user(uuid, text, public.membership_role[]) from public, anon;
grant execute on function public.invite_tenant_user(uuid, text, public.membership_role[]) to authenticated;

create or replace function public.list_platform_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_status text,
  primary_color text,
  user_count bigint,
  process_count bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  ) then
    raise exception 'Platform administrator access required';
  end if;

  return query
  select
    tenant.id,
    tenant.name,
    tenant.slug,
    tenant.status,
    coalesce(branding.primary_color, '#1F6D62'),
    (
      select count(*)
      from public.tenant_memberships membership
      where membership.tenant_id = tenant.id
        and membership.status = 'ACTIVE'
    ),
    (
      select count(*)
      from public.processes process
      where process.tenant_id = tenant.id
        and process.deleted_at is null
    ),
    tenant.created_at
  from public.tenants tenant
  left join public.tenant_branding branding on branding.tenant_id = tenant.id
  where tenant.deleted_at is null
  order by tenant.created_at desc;
end;
$$;

revoke all on function public.list_platform_tenants() from public, anon;
grant execute on function public.list_platform_tenants() to authenticated;

create or replace function public.get_tenant_login_branding(p_slug text)
returns table (
  tenant_name text,
  primary_color text,
  accent_color text,
  google_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    tenant.name,
    coalesce(branding.primary_color, '#1F6D62'),
    coalesce(branding.accent_color, '#74D1BF'),
    coalesce(auth_settings.google_enabled, true)
  from public.tenants tenant
  left join public.tenant_branding branding on branding.tenant_id = tenant.id
  left join public.tenant_auth_settings auth_settings
    on auth_settings.tenant_id = tenant.id
  where tenant.slug = lower(trim(p_slug))
    and tenant.status = 'ACTIVE'
    and tenant.deleted_at is null
  limit 1;
$$;

revoke all on function public.get_tenant_login_branding(text) from public;
grant execute on function public.get_tenant_login_branding(text) to anon, authenticated;

comment on table private.platform_admin_allowlist is
  'Verified Google emails that bootstrap to Emilda platform administration.';
comment on function public.accept_my_tenant_invitations() is
  'Accepts matching unexpired tenant invitations for the current verified Google identity.';
comment on function public.get_tenant_login_branding(text) is
  'Exposes only the safe visual identity required to render a tenant sign-in page.';
