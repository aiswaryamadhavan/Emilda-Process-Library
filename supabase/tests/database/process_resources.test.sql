begin;
select plan(9);

select has_table(
  'public',
  'process_resource_links',
  'Process template links use a normalized tenant-owned table'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);

create temporary table test_resource_context as
select
  public.clone_process_version(
    '50000000-0000-4000-8000-000000000001',
    'Add the approved closure document template',
    'IMPROVEMENT'
  ) as version_id;

alter table test_resource_context add column link_id uuid;

select lives_ok(
  $$update test_resource_context
    set link_id = public.add_process_resource_link(
      '50000000-0000-4000-8000-000000000001',
      version_id,
      'Weekly scorecard closure template',
      'TEMPLATE',
      'https://docs.example.com/templates/weekly-scorecard-closure',
      'Use after the leadership review is complete.'
    )$$,
  'A Process Guardian can add a safe document link to an editable draft'
);

select is(
  (
    select count(*)
    from public.process_resource_links resource_link
    where resource_link.id = (select link_id from test_resource_context)
      and resource_link.resource_type = 'TEMPLATE'
  ),
  1::bigint,
  'The process template link is stored against the exact process version'
);

select throws_ok(
  $$select public.add_process_resource_link(
    '50000000-0000-4000-8000-000000000001',
    (select version_id from test_resource_context),
    'Unsafe link',
    'DOCUMENT',
    'javascript:alert(1)',
    null
  )$$,
  'Process resource link is invalid',
  'Unsafe non-HTTP resource links are rejected'
);

select throws_ok(
  $$insert into public.process_resource_links (
    tenant_id,
    process_id,
    version_id,
    label,
    resource_type,
    url,
    created_by
  ) values (
    '10000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'Late edit',
    'DOCUMENT',
    'https://docs.example.com/late-edit',
    '20000000-0000-4000-8000-000000000002'
  )$$,
  'Approved process version content is immutable',
  'Links cannot be added to an active approved process version'
);

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000008',
  true
);

select is(
  (
    select count(*)
    from public.process_resource_links
    where id = (select link_id from test_resource_context)
  ),
  0::bigint,
  'A user from another tenant cannot discover process template links'
);

select throws_ok(
  $$select public.remove_process_resource_link(
    (select link_id from test_resource_context)
  )$$,
  'Editable process draft not found',
  'A cross-tenant removal attempt reveals no resource existence'
);

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$select public.remove_process_resource_link(
    (select link_id from test_resource_context)
  )$$,
  'The authorized Guardian can remove a link from the draft'
);

select is(
  (
    select count(*)
    from public.process_resource_links
    where id = (select link_id from test_resource_context)
  ),
  0::bigint,
  'Removed draft links are no longer visible'
);

select * from finish();
rollback;
