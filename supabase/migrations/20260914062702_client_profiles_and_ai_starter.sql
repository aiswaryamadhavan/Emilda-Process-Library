create table public.tenant_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  legal_name text,
  trading_name text,
  website text,
  industry text,
  business_model text,
  founded_year integer check (founded_year between 1800 and 2200),
  company_size text,
  headquarters text,
  operating_locations text,
  default_currency text not null default 'INR' check (default_currency ~ '^[A-Z]{3}$'),
  owner_name text,
  owner_title text,
  owner_email text,
  owner_phone text,
  primary_contact_name text,
  primary_contact_title text,
  primary_contact_email text,
  primary_contact_phone text,
  products_services text,
  customer_types text,
  systems_used text,
  communication_channels text,
  operational_challenges text,
  business_goals text,
  owner_dependencies text,
  compliance_requirements text,
  decision_making_style text,
  seasonality text,
  notes text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (website is null or website ~* '^https?://'),
  check (owner_email is null or owner_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  check (primary_contact_email is null or primary_contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

alter table public.tenant_profiles enable row level security;
alter table public.tenant_profiles force row level security;

create policy tenant_profiles_member_select on public.tenant_profiles
  for select to authenticated
  using ((select private.is_tenant_member(tenant_id)));

create policy tenant_profiles_admin_insert on public.tenant_profiles
  for insert to authenticated
  with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));

create policy tenant_profiles_admin_update on public.tenant_profiles
  for update to authenticated
  using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')))
  with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));

revoke all on public.tenant_profiles from anon;
grant select, insert, update on public.tenant_profiles to authenticated;

comment on table public.tenant_profiles is
  'Tenant-scoped client context used for governance design and permission-aware AI suggestions.';

create or replace function private.profile_text(p_profile jsonb, p_key text)
returns text language sql immutable set search_path = '' as $$
  select nullif(trim(coalesce(p_profile ->> p_key, '')), '');
$$;

revoke all on function private.profile_text(jsonb, text) from public, anon, authenticated;

create or replace function public.save_tenant_profile(
  p_tenant_id uuid,
  p_profile jsonb,
  p_departments text[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_founded_year integer;
begin
  if not private.has_tenant_role(p_tenant_id, 'TENANT_ADMIN') then
    raise exception 'Tenant administrator access required';
  end if;
  if jsonb_typeof(p_profile) <> 'object' then
    raise exception 'Client profile is invalid';
  end if;

  v_founded_year := nullif(p_profile ->> 'foundedYear', '')::integer;

  insert into public.tenant_profiles (
    tenant_id, legal_name, trading_name, website, industry, business_model,
    founded_year, company_size, headquarters, operating_locations,
    default_currency, owner_name, owner_title, owner_email, owner_phone,
    primary_contact_name, primary_contact_title, primary_contact_email,
    primary_contact_phone, products_services, customer_types, systems_used,
    communication_channels, operational_challenges, business_goals,
    owner_dependencies, compliance_requirements, decision_making_style,
    seasonality, notes, updated_by, updated_at
  ) values (
    p_tenant_id,
    private.profile_text(p_profile, 'legalName'),
    private.profile_text(p_profile, 'tradingName'),
    private.profile_text(p_profile, 'website'),
    private.profile_text(p_profile, 'industry'),
    private.profile_text(p_profile, 'businessModel'),
    v_founded_year,
    private.profile_text(p_profile, 'companySize'),
    private.profile_text(p_profile, 'headquarters'),
    private.profile_text(p_profile, 'operatingLocations'),
    upper(coalesce(private.profile_text(p_profile, 'currency'), 'INR')),
    private.profile_text(p_profile, 'ownerName'),
    private.profile_text(p_profile, 'ownerTitle'),
    private.profile_text(p_profile, 'ownerEmail'),
    private.profile_text(p_profile, 'ownerPhone'),
    private.profile_text(p_profile, 'primaryContactName'),
    private.profile_text(p_profile, 'primaryContactTitle'),
    private.profile_text(p_profile, 'primaryContactEmail'),
    private.profile_text(p_profile, 'primaryContactPhone'),
    private.profile_text(p_profile, 'productsServices'),
    private.profile_text(p_profile, 'customerTypes'),
    private.profile_text(p_profile, 'systemsUsed'),
    private.profile_text(p_profile, 'communicationChannels'),
    private.profile_text(p_profile, 'operationalChallenges'),
    private.profile_text(p_profile, 'businessGoals'),
    private.profile_text(p_profile, 'ownerDependencies'),
    private.profile_text(p_profile, 'complianceRequirements'),
    private.profile_text(p_profile, 'decisionMakingStyle'),
    private.profile_text(p_profile, 'seasonality'),
    private.profile_text(p_profile, 'notes'),
    auth.uid(),
    now()
  )
  on conflict (tenant_id) do update set
    legal_name = excluded.legal_name,
    trading_name = excluded.trading_name,
    website = excluded.website,
    industry = excluded.industry,
    business_model = excluded.business_model,
    founded_year = excluded.founded_year,
    company_size = excluded.company_size,
    headquarters = excluded.headquarters,
    operating_locations = excluded.operating_locations,
    default_currency = excluded.default_currency,
    owner_name = excluded.owner_name,
    owner_title = excluded.owner_title,
    owner_email = excluded.owner_email,
    owner_phone = excluded.owner_phone,
    primary_contact_name = excluded.primary_contact_name,
    primary_contact_title = excluded.primary_contact_title,
    primary_contact_email = excluded.primary_contact_email,
    primary_contact_phone = excluded.primary_contact_phone,
    products_services = excluded.products_services,
    customer_types = excluded.customer_types,
    systems_used = excluded.systems_used,
    communication_channels = excluded.communication_channels,
    operational_challenges = excluded.operational_challenges,
    business_goals = excluded.business_goals,
    owner_dependencies = excluded.owner_dependencies,
    compliance_requirements = excluded.compliance_requirements,
    decision_making_style = excluded.decision_making_style,
    seasonality = excluded.seasonality,
    notes = excluded.notes,
    updated_by = auth.uid(),
    updated_at = now();

  insert into public.departments (tenant_id, name)
  select p_tenant_id, department_name
  from (
    select distinct trim(value) as department_name
    from unnest(coalesce(p_departments, array[]::text[])) value
  ) names
  where length(department_name) between 2 and 120
  on conflict (tenant_id, name) do nothing;

  insert into public.activity_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_tenant_id,
    auth.uid(),
    'CLIENT_PROFILE_UPDATED',
    'TENANT',
    p_tenant_id,
    jsonb_build_object('departments', coalesce(array_length(p_departments, 1), 0))
  );
end;
$$;

revoke all on function public.save_tenant_profile(uuid, jsonb, text[]) from public, anon;
grant execute on function public.save_tenant_profile(uuid, jsonb, text[]) to authenticated;

create or replace function public.provision_tenant_with_profile(
  p_name text,
  p_slug text,
  p_primary text,
  p_accent text,
  p_google boolean,
  p_microsoft boolean,
  p_invite_email text,
  p_invite_roles public.membership_role[],
  p_access_scope text,
  p_first_process text,
  p_first_process_department text,
  p_profile jsonb,
  p_departments text[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_role public.membership_role;
  v_process_id uuid := gen_random_uuid();
  v_department_id uuid;
  v_founded_year integer;
begin
  if not exists (select 1 from public.platform_admins where user_id = auth.uid()) then
    raise exception 'Platform administrator access required';
  end if;
  if length(trim(p_name)) < 2
    or p_slug !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'
    or p_primary !~ '^#[0-9A-Fa-f]{6}$'
    or p_accent !~ '^#[0-9A-Fa-f]{6}$'
    or not (p_google or p_microsoft)
    or p_invite_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or coalesce(array_length(p_invite_roles, 1), 0) = 0
    or p_access_scope not in ('EVERYONE', 'RESTRICTED')
    or length(trim(p_first_process)) < 2
    or length(trim(p_first_process_department)) < 2
    or jsonb_typeof(p_profile) <> 'object'
  then
    raise exception 'Tenant configuration is invalid';
  end if;

  v_founded_year := nullif(p_profile ->> 'foundedYear', '')::integer;
  insert into public.tenants (id, name, slug, timezone)
  values (v_id, trim(p_name), p_slug, coalesce(private.profile_text(p_profile, 'timezone'), 'Asia/Kolkata'));
  insert into public.tenant_branding (tenant_id, primary_color, accent_color)
  values (v_id, p_primary, p_accent);
  insert into public.tenant_auth_settings (tenant_id, google_enabled, microsoft_enabled, email_enabled)
  values (v_id, p_google, p_microsoft, false);

  insert into public.tenant_profiles (
    tenant_id, legal_name, trading_name, website, industry, business_model,
    founded_year, company_size, headquarters, operating_locations,
    default_currency, owner_name, owner_title, owner_email, owner_phone,
    primary_contact_name, primary_contact_title, primary_contact_email,
    primary_contact_phone, products_services, customer_types, systems_used,
    communication_channels, operational_challenges, business_goals,
    owner_dependencies, compliance_requirements, decision_making_style,
    seasonality, notes, updated_by
  ) values (
    v_id,
    private.profile_text(p_profile, 'legalName'),
    private.profile_text(p_profile, 'tradingName'),
    private.profile_text(p_profile, 'website'),
    private.profile_text(p_profile, 'industry'),
    private.profile_text(p_profile, 'businessModel'),
    v_founded_year,
    private.profile_text(p_profile, 'companySize'),
    private.profile_text(p_profile, 'headquarters'),
    private.profile_text(p_profile, 'operatingLocations'),
    upper(coalesce(private.profile_text(p_profile, 'currency'), 'INR')),
    private.profile_text(p_profile, 'ownerName'),
    private.profile_text(p_profile, 'ownerTitle'),
    private.profile_text(p_profile, 'ownerEmail'),
    private.profile_text(p_profile, 'ownerPhone'),
    private.profile_text(p_profile, 'primaryContactName'),
    private.profile_text(p_profile, 'primaryContactTitle'),
    private.profile_text(p_profile, 'primaryContactEmail'),
    private.profile_text(p_profile, 'primaryContactPhone'),
    private.profile_text(p_profile, 'productsServices'),
    private.profile_text(p_profile, 'customerTypes'),
    private.profile_text(p_profile, 'systemsUsed'),
    private.profile_text(p_profile, 'communicationChannels'),
    private.profile_text(p_profile, 'operationalChallenges'),
    private.profile_text(p_profile, 'businessGoals'),
    private.profile_text(p_profile, 'ownerDependencies'),
    private.profile_text(p_profile, 'complianceRequirements'),
    private.profile_text(p_profile, 'decisionMakingStyle'),
    private.profile_text(p_profile, 'seasonality'),
    private.profile_text(p_profile, 'notes'),
    auth.uid()
  );

  insert into public.departments (tenant_id, name)
  select v_id, department_name
  from (
    select distinct trim(value) as department_name
    from unnest(coalesce(p_departments, array[]::text[])) value
  ) names
  where length(department_name) between 2 and 120
  on conflict (tenant_id, name) do nothing;

  select id into v_department_id
  from public.departments
  where tenant_id = v_id
    and lower(name) = lower(trim(p_first_process_department));

  if v_department_id is null then
    raise exception 'First process department is invalid';
  end if;

  foreach v_role in array enum_range(null::public.membership_role) loop
    insert into public.roles (tenant_id, role) values (v_id, v_role);
  end loop;
  insert into public.tenant_invitations (tenant_id, email, invited_by, token_hash, requested_roles, expires_at)
  values (
    v_id,
    lower(trim(p_invite_email)),
    auth.uid(),
    encode(extensions.digest(gen_random_uuid()::text, 'sha256'), 'hex'),
    p_invite_roles,
    now() + interval '7 days'
  );
  insert into public.processes (id, tenant_id, process_key, name, department_id, access_scope, created_by)
  values (
    v_process_id,
    v_id,
    trim(both '-' from regexp_replace(lower(trim(p_first_process)), '[^a-z0-9]+', '-', 'g')),
    trim(p_first_process),
    v_department_id,
    p_access_scope,
    auth.uid()
  );
  insert into public.process_versions (tenant_id, process_id, major_version, minor_version, status, change_reason, design_stage, created_by)
  values (v_id, v_process_id, 1, 0, 'DRAFT', 'Initial process design', 1, auth.uid());
  insert into public.activity_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_id,
    auth.uid(),
    'TENANT_CREATED',
    'TENANT',
    v_id,
    jsonb_build_object('slug', p_slug, 'profile_captured', true, 'departments', coalesce(array_length(p_departments, 1), 0))
  );
  return v_id;
end;
$$;

revoke all on function public.provision_tenant_with_profile(text, text, text, text, boolean, boolean, text, public.membership_role[], text, text, text, jsonb, text[]) from public, anon;
grant execute on function public.provision_tenant_with_profile(text, text, text, text, boolean, boolean, text, public.membership_role[], text, text, text, jsonb, text[]) to authenticated;

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
  v_source_id uuid;
  v_target_id uuid;
  v_sort integer := 0;
begin
  select tm.id into v_membership_id
  from public.tenant_memberships tm
  where tm.tenant_id = p_tenant_id
    and tm.user_id = auth.uid()
    and tm.status = 'ACTIVE';

  if v_membership_id is null or not (
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
    v_version_id, jsonb_build_object('process_id', v_process_id, 'department', p_department_name)
  );

  return jsonb_build_object(
    'processId', v_process_id,
    'versionId', v_version_id,
    'processKey', v_process_key
  );
end;
$$;

revoke all on function public.create_process_from_starter(uuid, text, jsonb) from public, anon;
grant execute on function public.create_process_from_starter(uuid, text, jsonb) to authenticated;
