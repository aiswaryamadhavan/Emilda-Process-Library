begin;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '21000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'paul@emildasolutions.com', '', now(),
  '', '', '', '',
  '{"provider":"google","providers":["google"]}',
  '{"full_name":"Paul"}', now(), now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000001',
  true
);

select ok(public.is_platform_admin(), 'Allowlisted verified Google user becomes a platform administrator');
select is(
  (select count(*) from public.list_platform_tenants()),
  2::bigint,
  'Platform administrator can list client tenants without receiving process data'
);
select is(
  public.open_platform_tenant('10000000-0000-4000-8000-000000000002') ->> 'slug',
  'northstar',
  'Platform administrator can deliberately open a client for setup'
);
select ok(
  private.has_active_support_access('10000000-0000-4000-8000-000000000002'),
  'Opening a client creates active time-bounded support access'
);
select ok(
  private.has_tenant_role(
    '10000000-0000-4000-8000-000000000002',
    'TENANT_ADMIN'::public.membership_role
  ),
  'Active setup access grants temporary Tenant Admin authority'
);
select is(
  (
    select count(*)
    from public.activity_logs log_record
    where log_record.tenant_id = '10000000-0000-4000-8000-000000000002'
      and log_record.actor_id = '21000000-0000-4000-8000-000000000001'
      and log_record.action = 'SUPPORT_ACCESS_GRANTED'
  ),
  1::bigint,
  'Temporary setup access is recorded in the tenant activity log'
);
select lives_ok(
  $$select public.invite_tenant_user(
    '10000000-0000-4000-8000-000000000001',
    'newuser@emildasolutions.com',
    array['PROCESS_GUARDIAN','VIEWER']::public.membership_role[]
  )$$,
  'Platform administrator can create Google access for a client'
);
set local role service_role;
select is(
  (
    select requested_roles
    from public.tenant_invitations
    where tenant_id = '10000000-0000-4000-8000-000000000001'
      and email = 'newuser@emildasolutions.com'
      and accepted_at is null
    order by created_at desc
    limit 1
  ),
  array['PROCESS_GUARDIAN','VIEWER']::public.membership_role[],
  'Invitation stores the exact assigned roles'
);

reset role;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '21000000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 'newuser@emildasolutions.com', '', now(),
  '', '', '', '',
  '{"provider":"google","providers":["google"]}',
  '{"full_name":"New Guardian"}', now(), now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000002',
  true
);
select is(
  jsonb_array_length(public.accept_my_tenant_invitations()),
  1,
  'Matching verified Google identity accepts its invitation'
);
select is(
  (
    select count(*)
    from public.tenant_memberships membership
    where membership.tenant_id = '10000000-0000-4000-8000-000000000001'
      and membership.user_id = '21000000-0000-4000-8000-000000000002'
      and membership.status = 'ACTIVE'
  ),
  1::bigint,
  'Accepted invitation creates an active tenant membership'
);
select is(
  (
    select count(*)
    from public.membership_roles membership_role
    join public.tenant_memberships membership
      on membership.id = membership_role.membership_id
    where membership.user_id = '21000000-0000-4000-8000-000000000002'
  ),
  2::bigint,
  'Accepted invitation applies every assigned role'
);
select throws_ok(
  $$select public.open_platform_tenant('10000000-0000-4000-8000-000000000002')$$,
  'P0001',
  'Platform administrator access required',
  'A regular tenant user cannot create support access'
);

reset role;
update public.tenant_auth_settings
set google_enabled = false,
  microsoft_enabled = true,
  email_enabled = true
where tenant_id = '10000000-0000-4000-8000-000000000001';
select is(
  (
    select row(google_enabled, microsoft_enabled, email_enabled)::text
    from public.tenant_auth_settings
    where tenant_id = '10000000-0000-4000-8000-000000000001'
  ),
  '(t,f,f)',
  'Database enforces Google-only tenant authentication'
);

select * from finish();
rollback;
