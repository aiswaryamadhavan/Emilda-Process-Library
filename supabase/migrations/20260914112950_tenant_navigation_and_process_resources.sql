-- Resolve all stable tenant-shell information in one permission-checked call.
-- This replaces the request waterfall previously performed by the root layout.
create or replace function public.get_tenant_shell_context(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_display_name text;
  v_role public.membership_role;
  v_support record;
  v_role_label text := 'Team member';
begin
  if auth.uid() is null then
    return null;
  end if;

  select
    tenant.id,
    tenant.name,
    tenant.slug,
    coalesce(branding.primary_color, '#145e66') as primary_color,
    coalesce(branding.accent_color, '#8bd3c7') as accent_color
  into v_tenant
  from public.tenants tenant
  left join public.tenant_branding branding
    on branding.tenant_id = tenant.id
  where tenant.slug = lower(trim(p_slug))
    and tenant.status = 'ACTIVE'
    and tenant.deleted_at is null
    and private.is_tenant_member(tenant.id);

  if v_tenant.id is null then
    return null;
  end if;

  select coalesce(
    nullif(trim(profile.display_name), ''),
    nullif(split_part(auth_user.email, '@', 1), ''),
    'Emilda user'
  )
  into v_display_name
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where auth_user.id = auth.uid();

  select role_record.role
  into v_role
  from public.tenant_memberships membership
  join public.membership_roles membership_role
    on membership_role.tenant_id = membership.tenant_id
    and membership_role.membership_id = membership.id
  join public.roles role_record
    on role_record.tenant_id = membership_role.tenant_id
    and role_record.id = membership_role.role_id
  where membership.tenant_id = v_tenant.id
    and membership.user_id = auth.uid()
    and membership.status = 'ACTIVE'
  order by case role_record.role
    when 'TENANT_ADMIN' then 1
    when 'PROCESS_GUARDIAN' then 2
    when 'PROCESS_OWNER' then 3
    when 'APPROVER' then 4
    when 'AUDITOR' then 5
    when 'CONTRIBUTOR' then 6
    when 'VIEWER' then 7
  end
  limit 1;

  select grant_record.reason, grant_record.expires_at
  into v_support
  from public.support_access_grants grant_record
  where grant_record.tenant_id = v_tenant.id
    and grant_record.user_id = auth.uid()
    and grant_record.revoked_at is null
    and now() between grant_record.starts_at and grant_record.expires_at
  order by grant_record.expires_at desc
  limit 1;

  if v_support.expires_at is not null then
    v_role_label := 'Emilda Setup Access';
  elsif v_role is not null then
    v_role_label := initcap(replace(v_role::text, '_', ' '));
  end if;

  return jsonb_build_object(
    'tenantId', v_tenant.id,
    'tenantName', v_tenant.name,
    'tenantSlug', v_tenant.slug,
    'primaryColor', v_tenant.primary_color,
    'accentColor', v_tenant.accent_color,
    'viewerName', coalesce(v_display_name, 'Emilda user'),
    'viewerRole', v_role_label,
    'supportReason', v_support.reason,
    'supportExpiresAt', v_support.expires_at
  );
end;
$$;

revoke all on function public.get_tenant_shell_context(text)
  from public, anon;
grant execute on function public.get_tenant_shell_context(text)
  to authenticated;

comment on function public.get_tenant_shell_context(text) is
  'Returns one authenticated user tenant shell context without exposing inaccessible tenants.';

-- The process library and owner home use one query instead of several dependent
-- tenant, version, department, audit, membership, and profile lookups.
create or replace function public.list_my_process_summaries(p_tenant_id uuid)
returns table (
  process_id uuid,
  process_name text,
  department_name text,
  owner_name text,
  version_id uuid,
  major_version integer,
  minor_version integer,
  version_status public.process_version_status,
  health public.health_status,
  purpose text,
  last_audit_at timestamptz,
  next_audit_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_tenant_member(p_tenant_id) then
    raise exception 'Tenant not found';
  end if;

  return query
  select
    process.id,
    process.name,
    coalesce(department.name, 'Unassigned'),
    coalesce(nullif(trim(owner_profile.display_name), ''), 'Owner to confirm'),
    selected_version.id,
    selected_version.major_version,
    selected_version.minor_version,
    selected_version.status,
    process.current_health,
    coalesce(selected_version.purpose, 'Purpose to confirm during process design.'),
    latest_audit.completed_at,
    process.next_audit_at
  from public.processes process
  left join public.departments department
    on department.tenant_id = process.tenant_id
    and department.id = process.department_id
  left join lateral (
    select version.*
    from public.process_versions version
    where version.tenant_id = process.tenant_id
      and version.process_id = process.id
      and version.deleted_at is null
    order by
      (version.id = process.current_active_version_id) desc,
      version.created_at desc
    limit 1
  ) selected_version on true
  left join public.tenant_memberships owner_membership
    on owner_membership.tenant_id = process.tenant_id
    and owner_membership.id = selected_version.owner_membership_id
  left join public.profiles owner_profile
    on owner_profile.id = owner_membership.user_id
  left join lateral (
    select audit.completed_at
    from public.audits audit
    where audit.tenant_id = process.tenant_id
      and audit.process_id = process.id
      and audit.status = 'COMPLETED'
    order by audit.completed_at desc
    limit 1
  ) latest_audit on true
  where process.tenant_id = p_tenant_id
    and process.deleted_at is null
    and private.can_view_process(process.tenant_id, process.id)
  order by process.name;
end;
$$;

revoke all on function public.list_my_process_summaries(uuid)
  from public, anon;
grant execute on function public.list_my_process_summaries(uuid)
  to authenticated;

alter table public.process_versions
  add constraint process_versions_tenant_process_version_key
  unique (tenant_id, process_id, id);

create table public.process_resource_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  process_id uuid not null,
  version_id uuid not null,
  label text not null check (length(trim(label)) between 2 and 160),
  resource_type text not null default 'TEMPLATE'
    check (resource_type in ('TEMPLATE', 'DOCUMENT', 'FORM', 'EXAMPLE', 'OTHER')),
  url text not null check (
    length(url) between 10 and 2048
    and url ~* '^https?://'
  ),
  description text check (description is null or length(description) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, process_id)
    references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, process_id, version_id)
    references public.process_versions(tenant_id, process_id, id) on delete cascade
);

create index process_resource_links_version_idx
  on public.process_resource_links(tenant_id, process_id, version_id, created_at);

alter table public.process_resource_links enable row level security;
alter table public.process_resource_links force row level security;

revoke all on table public.process_resource_links from anon, authenticated;
grant select, insert, update, delete on table public.process_resource_links
  to authenticated;

create policy process_resource_links_process_select
on public.process_resource_links for select
to authenticated
using ((select private.can_view_process(tenant_id, process_id)));

create policy process_resource_links_guardian_all
on public.process_resource_links for all
to authenticated
using ((select private.can_design_process(tenant_id, process_id)))
with check ((select private.can_design_process(tenant_id, process_id)));

create trigger protect_process_resource_links
before insert or update or delete on public.process_resource_links
for each row execute function private.protect_locked_version_child();

create or replace function public.add_process_resource_link(
  p_process_id uuid,
  p_version_id uuid,
  p_label text,
  p_resource_type text,
  p_url text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.process_versions;
  v_link_id uuid;
begin
  select * into v_version
  from public.process_versions version
  where version.id = p_version_id
    and version.process_id = p_process_id
    and version.deleted_at is null;

  if v_version.id is null
    or v_version.status not in ('DRAFT', 'CHANGES_REQUESTED')
    or not private.can_design_process(v_version.tenant_id, p_process_id)
  then
    raise exception 'Editable process draft not found';
  end if;
  if length(trim(coalesce(p_label, ''))) not between 2 and 160
    or p_resource_type not in ('TEMPLATE', 'DOCUMENT', 'FORM', 'EXAMPLE', 'OTHER')
    or length(trim(coalesce(p_url, ''))) not between 10 and 2048
    or trim(p_url) !~* '^https?://'
    or length(coalesce(p_description, '')) > 500
  then
    raise exception 'Process resource link is invalid';
  end if;

  insert into public.process_resource_links (
    tenant_id,
    process_id,
    version_id,
    label,
    resource_type,
    url,
    description,
    created_by
  ) values (
    v_version.tenant_id,
    p_process_id,
    p_version_id,
    trim(p_label),
    p_resource_type,
    trim(p_url),
    nullif(trim(p_description), ''),
    auth.uid()
  ) returning id into v_link_id;

  insert into public.activity_logs (
    tenant_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    v_version.tenant_id,
    auth.uid(),
    'PROCESS_RESOURCE_LINK_ADDED',
    'PROCESS_VERSION',
    p_version_id,
    jsonb_build_object(
      'process_id', p_process_id,
      'resource_link_id', v_link_id,
      'label', trim(p_label),
      'resource_type', p_resource_type
    )
  );

  return v_link_id;
end;
$$;

revoke all on function public.add_process_resource_link(uuid, uuid, text, text, text, text)
  from public, anon;
grant execute on function public.add_process_resource_link(uuid, uuid, text, text, text, text)
  to authenticated;

create or replace function public.remove_process_resource_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.process_resource_links;
  v_status public.process_version_status;
begin
  select * into v_link
  from public.process_resource_links resource_link
  where resource_link.id = p_link_id;

  if v_link.id is null then
    raise exception 'Editable process draft not found';
  end if;
  select version.status into v_status
  from public.process_versions version
  where version.id = v_link.version_id
    and version.process_id = v_link.process_id;

  if v_status not in ('DRAFT', 'CHANGES_REQUESTED')
    or not private.can_design_process(v_link.tenant_id, v_link.process_id)
  then
    raise exception 'Editable process draft not found';
  end if;

  delete from public.process_resource_links where id = p_link_id;

  insert into public.activity_logs (
    tenant_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    v_link.tenant_id,
    auth.uid(),
    'PROCESS_RESOURCE_LINK_REMOVED',
    'PROCESS_VERSION',
    v_link.version_id,
    jsonb_build_object(
      'process_id', v_link.process_id,
      'resource_link_id', v_link.id,
      'label', v_link.label
    )
  );
end;
$$;

revoke all on function public.remove_process_resource_link(uuid)
  from public, anon;
grant execute on function public.remove_process_resource_link(uuid)
  to authenticated;

-- Resource links are part of the approved operating standard. Copy them when a
-- new draft version is created, then let the Guardian change only that draft.
create or replace function private.clone_process_resource_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_version_id is not null then
    insert into public.process_resource_links (
      tenant_id,
      process_id,
      version_id,
      label,
      resource_type,
      url,
      description,
      created_by
    )
    select
      new.tenant_id,
      new.process_id,
      new.id,
      resource_link.label,
      resource_link.resource_type,
      resource_link.url,
      resource_link.description,
      new.created_by
    from public.process_resource_links resource_link
    where resource_link.tenant_id = new.tenant_id
      and resource_link.process_id = new.process_id
      and resource_link.version_id = new.source_version_id;
  end if;
  return new;
end;
$$;

create trigger clone_process_resource_links
after insert on public.process_versions
for each row execute function private.clone_process_resource_links();

-- Allow a platform administrator with explicit temporary setup access to create
-- a process even though they intentionally have no permanent tenant membership.
create or replace function public.create_process_from_starter(
  p_tenant_id uuid,
  p_department_name text,
  p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_membership_id uuid;
  v_department_id uuid;
  v_process_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_process_key text;
  v_node jsonb;
  v_edge jsonb;
  v_metric jsonb;
  v_exception jsonb;
  v_resource jsonb;
  v_source_id uuid;
  v_target_id uuid;
  v_sort integer := 0;
begin
  select membership.id into v_membership_id
  from public.tenant_memberships membership
  where membership.tenant_id = p_tenant_id
    and membership.user_id = auth.uid()
    and membership.status = 'ACTIVE';

  if not (
    private.has_tenant_role(p_tenant_id, 'TENANT_ADMIN')
    or private.has_tenant_role(p_tenant_id, 'PROCESS_GUARDIAN')
  ) then
    raise exception 'Process design access required';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
    or length(trim(coalesce(p_payload ->> 'name', ''))) < 2
    or jsonb_typeof(p_payload #> '{draft,graph,nodes}') <> 'array'
    or jsonb_typeof(p_payload #> '{draft,graph,edges}') <> 'array'
  then
    raise exception 'Process starter payload is invalid';
  end if;

  select id into v_department_id
  from public.departments
  where tenant_id = p_tenant_id and lower(name) = lower(trim(p_department_name));

  if v_department_id is null then
    insert into public.departments (tenant_id, name)
    values (p_tenant_id, trim(p_department_name))
    returning id into v_department_id;
  end if;

  v_process_key := trim(both '-' from regexp_replace(lower(trim(p_payload ->> 'name')), '[^a-z0-9]+', '-', 'g'));
  if exists (select 1 from public.processes where tenant_id = p_tenant_id and process_key = v_process_key) then
    v_process_key := v_process_key || '-' || left(replace(v_process_id::text, '-', ''), 6);
  end if;

  insert into public.processes (
    id, tenant_id, process_key, name, department_id, guardian_membership_id,
    access_scope, created_by
  ) values (
    v_process_id, p_tenant_id, v_process_key, trim(p_payload ->> 'name'),
    v_department_id, v_membership_id, 'RESTRICTED', auth.uid()
  );

  insert into public.process_versions (
    id, tenant_id, process_id, status, change_reason, purpose,
    business_problem, goal, in_scope, out_of_scope, trigger_description,
    current_state, future_state, constraints, design_stage, created_by
  ) values (
    v_version_id, p_tenant_id, v_process_id, 'DRAFT', 'Initial AI-assisted process draft',
    p_payload #>> '{draft,purpose}', p_payload #>> '{draft,businessProblem}',
    p_payload #>> '{draft,goal}', p_payload #>> '{draft,inScope}',
    p_payload #>> '{draft,outOfScope}', p_payload #>> '{draft,trigger}',
    p_payload ->> 'currentMethod', 'AI-assisted starting draft; human review required.',
    p_payload ->> 'constraints', 5, auth.uid()
  );

  for v_node in select value from jsonb_array_elements(p_payload #> '{draft,graph,nodes}') loop
    insert into public.process_nodes (
      tenant_id, process_id, version_id, node_key, node_type, title,
      action_text, timing, why, evidence, position_x, position_y, sort_order,
      metadata
    ) values (
      p_tenant_id, v_process_id, v_version_id, v_node ->> 'id',
      (v_node ->> 'type')::public.process_node_type, v_node ->> 'title',
      v_node ->> 'action', v_node ->> 'timing', v_node ->> 'why',
      v_node ->> 'evidence', coalesce((v_node #>> '{position,x}')::numeric, 0),
      coalesce((v_node #>> '{position,y}')::numeric, 0), v_sort,
      jsonb_build_object('suggested_actor', v_node ->> 'actor')
    );
    v_sort := v_sort + 1;
  end loop;

  v_sort := 0;
  for v_edge in select value from jsonb_array_elements(p_payload #> '{draft,graph,edges}') loop
    select id into v_source_id from public.process_nodes
      where version_id = v_version_id and node_key = v_edge ->> 'source';
    select id into v_target_id from public.process_nodes
      where version_id = v_version_id and node_key = v_edge ->> 'target';
    if v_source_id is null or v_target_id is null then
      raise exception 'Process connection references a missing step';
    end if;
    insert into public.process_edges (
      tenant_id, process_id, version_id, source_node_id, target_node_id,
      label, sort_order
    ) values (
      p_tenant_id, v_process_id, v_version_id, v_source_id, v_target_id,
      nullif(v_edge ->> 'label', ''), v_sort
    );
    v_sort := v_sort + 1;
  end loop;

  v_sort := 0;
  for v_metric in select value from jsonb_array_elements(coalesce(p_payload #> '{draft,metrics}', '[]'::jsonb)) loop
    insert into public.process_metrics (
      tenant_id, process_id, version_id, name, target, cadence, data_source,
      sort_order
    ) values (
      p_tenant_id, v_process_id, v_version_id, v_metric ->> 'name',
      v_metric ->> 'target', v_metric ->> 'cadence', v_metric ->> 'dataSource',
      v_sort
    );
    v_sort := v_sort + 1;
  end loop;

  v_sort := 0;
  for v_exception in select value from jsonb_array_elements(coalesce(p_payload #> '{draft,exceptions}', '[]'::jsonb)) loop
    insert into public.process_exceptions (
      tenant_id, process_id, version_id, scenario, response, escalation,
      sort_order
    ) values (
      p_tenant_id, v_process_id, v_version_id, v_exception ->> 'scenario',
      v_exception ->> 'response', v_exception ->> 'escalation', v_sort
    );
    v_sort := v_sort + 1;
  end loop;

  for v_resource in select value from jsonb_array_elements(coalesce(p_payload -> 'resourceLinks', '[]'::jsonb)) loop
    if coalesce(v_resource ->> 'url', '') !~* '^https?://'
      or length(trim(coalesce(v_resource ->> 'label', ''))) < 2
    then
      raise exception 'Process resource link is invalid';
    end if;
    insert into public.process_resource_links (
      tenant_id, process_id, version_id, label, resource_type, url,
      description, created_by
    ) values (
      p_tenant_id, v_process_id, v_version_id, trim(v_resource ->> 'label'),
      coalesce(v_resource ->> 'resourceType', 'TEMPLATE'),
      trim(v_resource ->> 'url'), nullif(trim(v_resource ->> 'description'), ''),
      auth.uid()
    );
  end loop;

  insert into public.ai_suggestions (
    tenant_id, process_id, kind, input_text, suggestion, assumptions,
    created_by
  ) values (
    p_tenant_id, v_process_id, 'PROCESS_STARTER', p_payload::text,
    p_payload -> 'draft', coalesce(p_payload #> '{draft,assumptions}', '[]'::jsonb),
    auth.uid()
  );

  insert into public.activity_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_tenant_id, auth.uid(), 'AI_PROCESS_DRAFT_CREATED', 'PROCESS_VERSION',
    v_version_id, jsonb_build_object(
      'process_id', v_process_id,
      'department', p_department_name,
      'resource_links', jsonb_array_length(coalesce(p_payload -> 'resourceLinks', '[]'::jsonb))
    )
  );

  return jsonb_build_object(
    'processId', v_process_id,
    'versionId', v_version_id,
    'processKey', v_process_key
  );
end;
$$;

revoke all on function public.create_process_from_starter(uuid, text, jsonb)
  from public, anon;
grant execute on function public.create_process_from_starter(uuid, text, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
