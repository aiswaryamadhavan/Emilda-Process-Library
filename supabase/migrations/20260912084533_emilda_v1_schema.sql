create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.membership_role as enum (
  'TENANT_ADMIN', 'PROCESS_GUARDIAN', 'PROCESS_OWNER', 'CONTRIBUTOR',
  'APPROVER', 'VIEWER', 'AUDITOR'
);
create type public.process_node_type as enum ('START', 'ACTION', 'DECISION', 'HANDOFF', 'WAIT', 'DATA', 'SUBPROCESS', 'END');
create type public.process_version_status as enum ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVAL_PENDING', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'SUPERSEDED', 'RETIRED');
create type public.release_status as enum ('PREPARING', 'SENT_FOR_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'ACTIVE');
create type public.health_status as enum ('HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL', 'NOT_ENOUGH_DATA');
create type public.issue_status as enum ('OPEN', 'INVESTIGATING', 'ACTION_ASSIGNED', 'RESOLVED', 'VERIFIED', 'CLOSED');
create type public.issue_severity as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type public.change_request_status as enum ('PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'VERIFIED');
create type public.approval_status as enum ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN');
create type public.audit_answer as enum ('YES', 'PARTIALLY', 'NO', 'NOT_APPLICABLE');
create type public.yes_no_na as enum ('YES', 'NO', 'NOT_APPLICABLE');
create type public.audit_status as enum ('DRAFT', 'COMPLETED');
create type public.audit_frequency as enum ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');
create type public.implementation_status as enum ('NOT_STARTED', 'IN_PROGRESS', 'PILOT', 'READY_FOR_GO_LIVE', 'LIVE', 'STABILIZING', 'COMPLETE');
create type public.adoption_status as enum ('NOT_STARTED', 'LOW', 'IMPROVING', 'STABLE');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  timezone text not null default 'Asia/Kolkata',
  custom_terminology jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, slug)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  logo_path text,
  dark_logo_path text,
  favicon_path text,
  primary_color text not null default '#1F6D62' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#74D1BF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

create table public.tenant_auth_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  google_enabled boolean not null default true,
  microsoft_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  check (google_enabled or microsoft_enabled or email_enabled)
);

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, name)
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid,
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, user_id),
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, role)
);

create table public.membership_roles (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null,
  role_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id),
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade,
  foreign key (tenant_id, role_id) references public.roles(tenant_id, id) on delete cascade
);

create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles(id),
  token_hash text not null unique,
  requested_roles public.membership_role[] not null default array['VIEWER']::public.membership_role[],
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (expires_at > created_at)
);

create table public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.platform_admins(user_id) on delete cascade,
  reason text not null check (length(reason) >= 10),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (expires_at > starts_at)
);

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  process_key text not null,
  name text not null check (length(name) between 2 and 160),
  department_id uuid,
  guardian_membership_id uuid,
  current_active_version_id uuid,
  current_health public.health_status not null default 'NOT_ENOUGH_DATA',
  audit_frequency public.audit_frequency not null default 'MONTHLY',
  custom_interval_days integer check (custom_interval_days between 1 and 365),
  next_audit_at timestamptz,
  access_scope text not null default 'RESTRICTED' check (access_scope in ('EVERYONE', 'RESTRICTED')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz,
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, process_key),
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id),
  foreign key (tenant_id, guardian_membership_id) references public.tenant_memberships(tenant_id, id)
);

create table public.process_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  process_id uuid not null,
  major_version integer not null default 1 check (major_version > 0),
  minor_version integer not null default 0 check (minor_version >= 0),
  content_revision integer not null default 1 check (content_revision > 0),
  source_version_id uuid,
  status public.process_version_status not null default 'DRAFT',
  change_reason text not null check (length(change_reason) >= 3),
  problem_to_solve text,
  purpose text,
  business_problem text,
  goal text,
  in_scope text,
  out_of_scope text,
  trigger_description text,
  current_state text,
  diagnosis text,
  future_state text,
  constraints text,
  owner_membership_id uuid,
  design_stage integer not null default 1 check (design_stage between 1 and 10),
  lock_version integer not null default 1,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  effective_at timestamptz,
  retirement_at timestamptz,
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique (process_id, major_version, minor_version),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, owner_membership_id) references public.tenant_memberships(tenant_id, id),
  foreign key (tenant_id, source_version_id) references public.process_versions(tenant_id, id)
);

alter table public.processes
  add constraint processes_active_version_fk
  foreign key (tenant_id, current_active_version_id) references public.process_versions(tenant_id, id);

create unique index one_active_version_per_process on public.process_versions(process_id) where status = 'ACTIVE';

create table public.process_nodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  process_id uuid not null,
  version_id uuid not null,
  node_key text not null,
  node_type public.process_node_type not null,
  title text not null,
  actor_membership_id uuid,
  action_text text,
  timing text,
  why text,
  tool text,
  evidence text,
  dependency text,
  exception_text text,
  escalation text,
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (version_id, node_key),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, actor_membership_id) references public.tenant_memberships(tenant_id, id)
);

create table public.process_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  process_id uuid not null,
  version_id uuid not null,
  source_node_id uuid not null,
  target_node_id uuid not null,
  label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, source_node_id) references public.process_nodes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, target_node_id) references public.process_nodes(tenant_id, id) on delete cascade,
  check (source_node_id <> target_node_id)
);

create table public.process_metrics (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  name text not null, target text not null, unit text, cadence text, data_source text, sort_order integer not null default 0,
  unique (tenant_id, id), foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade
);
create table public.process_rules (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  title text not null, description text not null, sort_order integer not null default 0, unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade
);
create table public.process_exceptions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  scenario text not null, response text not null, escalation text, sort_order integer not null default 0, unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade
);
create table public.process_contributors (
  tenant_id uuid not null, process_id uuid not null, version_id uuid not null, membership_id uuid not null,
  responsibility text, primary key (version_id, membership_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade
);
create table public.process_version_approvers (
  tenant_id uuid not null, process_id uuid not null, version_id uuid not null, membership_id uuid not null,
  primary key (version_id, membership_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade
);
create table public.process_audit_checkpoints (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  node_id uuid not null, question text not null, evidence_required boolean not null default true,
  sla_applicable boolean not null default true, exception_applicable boolean not null default true,
  is_critical boolean not null default false, sort_order integer not null default 0, unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, node_id) references public.process_nodes(tenant_id, id) on delete cascade
);

create table public.process_access_rules (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null,
  scope text not null check (scope in ('EVERYONE', 'DEPARTMENT', 'ROLE', 'USER')),
  department_id uuid, role_id uuid, membership_id uuid, created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id) on delete cascade,
  foreign key (tenant_id, role_id) references public.roles(tenant_id, id) on delete cascade,
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade,
  check (
    (scope = 'EVERYONE' and department_id is null and role_id is null and membership_id is null) or
    (scope = 'DEPARTMENT' and department_id is not null and role_id is null and membership_id is null) or
    (scope = 'ROLE' and role_id is not null and department_id is null and membership_id is null) or
    (scope = 'USER' and membership_id is not null and department_id is null and role_id is null)
  )
);

create table public.tags (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, unique (tenant_id, id), unique (tenant_id, name)
);
create table public.process_tags (
  tenant_id uuid not null, process_id uuid not null, tag_id uuid not null, primary key (process_id, tag_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, tag_id) references public.tags(tenant_id, id) on delete cascade
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  approver_membership_id uuid not null, requested_by uuid not null references public.profiles(id),
  content_revision integer not null, status public.approval_status not null default 'PENDING', requested_at timestamptz not null default now(),
  responded_at timestamptz, note text, unique (tenant_id, id), unique (version_id, approver_membership_id, content_revision),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, approver_membership_id) references public.tenant_memberships(tenant_id, id)
);
create table public.approval_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  approval_id uuid not null, actor_id uuid not null references public.profiles(id), event_type text not null,
  content_revision integer not null, acknowledgement_text text, note text, created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb, unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id),
  foreign key (tenant_id, approval_id) references public.approvals(tenant_id, id)
);
create table public.process_releases (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  status public.release_status not null default 'PREPARING', go_live_at timestamptz, old_process_stops_at timestamptz,
  snapshot jsonb, snapshot_hash text, approved_at timestamptz, activated_at timestamptz,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, id), unique (version_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id)
);
create table public.implementation_handoffs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  implementation_owner_id uuid, planned_go_live_at timestamptz, software_dependency text,
  status public.implementation_status not null default 'NOT_STARTED', go_live_decision boolean,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (tenant_id, id), unique (version_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id),
  foreign key (tenant_id, implementation_owner_id) references public.tenant_memberships(tenant_id, id)
);
create table public.implementation_checklist_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, handoff_id uuid not null,
  item_key text not null, label text not null, completed boolean not null default false, completed_by uuid references public.profiles(id),
  completed_at timestamptz, sort_order integer not null default 0, unique (tenant_id, id), unique (handoff_id, item_key),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, handoff_id) references public.implementation_handoffs(tenant_id, id) on delete cascade
);
create table public.adoption_checks (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  status public.adoption_status not null default 'NOT_STARTED', required_users_onboarded boolean,
  training_completed boolean, old_method_disabled boolean, blockers text, resistance_identified text, retraining_required boolean,
  checked_by uuid references public.profiles(id), checked_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id)
);

create table public.audits (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  title text not null, status public.audit_status not null default 'DRAFT', due_at timestamptz not null,
  started_by uuid not null references public.profiles(id), started_at timestamptz not null default now(), completed_at timestamptz,
  calculated_health public.health_status, calculated_score numeric(5,2), data_coverage numeric(5,2),
  override_health public.health_status, override_reason text, overridden_by uuid references public.profiles(id),
  last_checkpoint_id uuid, unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id)
);
create table public.audit_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, audit_id uuid not null,
  checkpoint_id uuid, node_id uuid, question text not null, is_critical boolean not null default false,
  followed public.audit_answer, evidence_available public.yes_no_na, sla_met public.yes_no_na,
  exception_occurred boolean, comment text, sort_order integer not null default 0, saved_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, audit_id) references public.audits(tenant_id, id) on delete cascade,
  foreign key (tenant_id, checkpoint_id) references public.process_audit_checkpoints(tenant_id, id),
  foreign key (tenant_id, node_id) references public.process_nodes(tenant_id, id)
);
alter table public.audits add constraint audits_last_checkpoint_fk foreign key (tenant_id, last_checkpoint_id) references public.audit_items(tenant_id, id);
create table public.audit_metric_results (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, audit_id uuid not null,
  metric_id uuid not null, result text not null check (result in ('MET', 'AT_RISK', 'MISSED')), value text, note text,
  unique (tenant_id, id), unique (audit_id, metric_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, audit_id) references public.audits(tenant_id, id) on delete cascade,
  foreign key (tenant_id, metric_id) references public.process_metrics(tenant_id, id)
);
create table public.health_snapshots (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, audit_id uuid,
  calculated_health public.health_status not null, displayed_health public.health_status not null,
  score numeric(5,2), data_coverage numeric(5,2) not null, factors jsonb not null,
  override_reason text, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, audit_id) references public.audits(tenant_id, id)
);
create table public.audit_cadence_changes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null,
  previous_frequency public.audit_frequency not null, new_frequency public.audit_frequency not null,
  previous_interval_days integer, new_interval_days integer, reason text not null,
  changed_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id)
);

create table public.issues (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  audit_id uuid, audit_item_id uuid, node_id uuid, title text not null, description text not null,
  severity public.issue_severity not null, root_cause text, assigned_to uuid, due_at timestamptz,
  status public.issue_status not null default 'OPEN', resolution text, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), resolved_at timestamptz, closed_at timestamptz, unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id),
  foreign key (tenant_id, audit_id) references public.audits(tenant_id, id),
  foreign key (tenant_id, audit_item_id) references public.audit_items(tenant_id, id),
  foreign key (tenant_id, node_id) references public.process_nodes(tenant_id, id),
  foreign key (tenant_id, assigned_to) references public.tenant_memberships(tenant_id, id)
);
create table public.issue_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, issue_id uuid not null,
  author_id uuid not null references public.profiles(id), body text not null, parent_id uuid, resolved_at timestamptz,
  created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, issue_id) references public.issues(tenant_id, id) on delete cascade,
  foreign key (tenant_id, parent_id) references public.issue_comments(tenant_id, id)
);
create table public.change_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null,
  problem_observed text not null, evidence_summary text, proposed_change text not null, expected_effect text,
  requested_by uuid not null references public.profiles(id), reviewer_membership_id uuid,
  status public.change_request_status not null default 'PROPOSED', created_version_id uuid,
  created_at timestamptz not null default now(), reviewed_at timestamptz, implemented_at timestamptz, verified_at timestamptz,
  unique (tenant_id, id), foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, reviewer_membership_id) references public.tenant_memberships(tenant_id, id),
  foreign key (tenant_id, created_version_id) references public.process_versions(tenant_id, id)
);
create table public.change_request_issues (
  tenant_id uuid not null, process_id uuid not null, change_request_id uuid not null, issue_id uuid not null,
  primary key (change_request_id, issue_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, change_request_id) references public.change_requests(tenant_id, id) on delete cascade,
  foreign key (tenant_id, issue_id) references public.issues(tenant_id, id) on delete cascade
);
create table public.change_request_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, change_request_id uuid not null,
  author_id uuid not null references public.profiles(id), body text not null, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, change_request_id) references public.change_requests(tenant_id, id) on delete cascade
);
create table public.governance_notes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  period_start date not null, period_end date not null, title text not null, body text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  revision integer not null default 1, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), published_at timestamptz, unique (tenant_id, id),
  check (period_end >= period_start)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  process_id uuid, uploader_id uuid not null references public.profiles(id), bucket text not null, object_path text not null unique,
  filename text not null, mime_type text not null, size_bytes bigint not null check (size_bytes between 1 and 26214400),
  sha256 text, status text not null default 'QUARANTINED' check (status in ('QUARANTINED', 'AVAILABLE', 'REJECTED')),
  created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id)
);
create table public.process_attachments (
  tenant_id uuid not null, process_id uuid not null, attachment_id uuid not null, version_id uuid, node_id uuid,
  primary key (attachment_id), foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, attachment_id) references public.attachments(tenant_id, id) on delete cascade,
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id),
  foreign key (tenant_id, node_id) references public.process_nodes(tenant_id, id)
);
create table public.audit_attachments (
  tenant_id uuid not null, process_id uuid not null, attachment_id uuid not null, audit_id uuid not null, audit_item_id uuid,
  primary key (attachment_id), foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, attachment_id) references public.attachments(tenant_id, id) on delete cascade,
  foreign key (tenant_id, audit_id) references public.audits(tenant_id, id),
  foreign key (tenant_id, audit_item_id) references public.audit_items(tenant_id, id)
);
create table public.issue_attachments (
  tenant_id uuid not null, process_id uuid not null, attachment_id uuid not null, issue_id uuid not null,
  primary key (attachment_id), foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, attachment_id) references public.attachments(tenant_id, id) on delete cascade,
  foreign key (tenant_id, issue_id) references public.issues(tenant_id, id)
);
create table public.change_request_attachments (
  tenant_id uuid not null, process_id uuid not null, attachment_id uuid not null, change_request_id uuid not null,
  primary key (attachment_id), foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, attachment_id) references public.attachments(tenant_id, id) on delete cascade,
  foreign key (tenant_id, change_request_id) references public.change_requests(tenant_id, id)
);
create table public.process_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, version_id uuid not null,
  node_id uuid, author_id uuid not null references public.profiles(id), body text not null, parent_id uuid,
  resolved_at timestamptz, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, version_id) references public.process_versions(tenant_id, id),
  foreign key (tenant_id, node_id) references public.process_nodes(tenant_id, id),
  foreign key (tenant_id, parent_id) references public.process_comments(tenant_id, id)
);
create table public.audit_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, audit_id uuid not null,
  author_id uuid not null references public.profiles(id), body text not null, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, audit_id) references public.audits(tenant_id, id)
);
create table public.approval_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, process_id uuid not null, approval_id uuid not null,
  author_id uuid not null references public.profiles(id), body text not null, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id),
  foreign key (tenant_id, approval_id) references public.approvals(tenant_id, id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), membership_id uuid not null,
  type text not null, title text not null, body text, href text, priority text not null default 'NORMAL' check (priority in ('CRITICAL', 'NEEDS_ATTENTION', 'NORMAL')),
  digest_key text, available_at timestamptz not null default now(), read_at timestamptz, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade
);
create table public.notification_preferences (
  tenant_id uuid not null, membership_id uuid not null, digest_mode boolean not null default true,
  critical_immediate boolean not null default true, updated_at timestamptz not null default now(), primary key (membership_id),
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade
);
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), actor_id uuid references public.profiles(id),
  action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique (tenant_id, id)
);
create table public.user_resume_states (
  tenant_id uuid not null, membership_id uuid not null, task_type text not null, entity_id uuid not null,
  href text not null, label text not null, progress_current integer, progress_total integer, updated_at timestamptz not null default now(),
  primary key (membership_id, task_type, entity_id), foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id) on delete cascade
);
create table public.search_documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), process_id uuid,
  source_type text not null, source_id uuid not null, title text not null, content text not null, href text not null,
  search_vector tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) stored,
  updated_at timestamptz not null default now(), unique (tenant_id, id), unique (tenant_id, source_type, source_id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id) on delete cascade
);
create index search_documents_vector_idx on public.search_documents using gin(search_vector);
create table public.api_rate_limits (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), user_id uuid not null references public.profiles(id),
  action text not null, window_start timestamptz not null, count integer not null default 1, unique (tenant_id, user_id, action, window_start)
);
create table public.ai_threads (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), membership_id uuid not null,
  title text not null, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, membership_id) references public.tenant_memberships(tenant_id, id)
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, thread_id uuid not null, role text not null check (role in ('USER', 'ASSISTANT')),
  content text not null, created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, thread_id) references public.ai_threads(tenant_id, id) on delete cascade
);
create table public.ai_citations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, message_id uuid not null, search_document_id uuid not null,
  label text not null, href text not null, sort_order integer not null default 0, unique (tenant_id, id),
  foreign key (tenant_id, message_id) references public.ai_messages(tenant_id, id) on delete cascade,
  foreign key (tenant_id, search_document_id) references public.search_documents(tenant_id, id)
);
create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), process_id uuid,
  kind text not null, input_text text not null, suggestion jsonb not null, assumptions jsonb not null default '[]'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), unique (tenant_id, id),
  foreign key (tenant_id, process_id) references public.processes(tenant_id, id)
);

-- RLS helper functions are isolated from the Data API and always bind checks to auth.uid().
create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id and tm.user_id = (select auth.uid()) and tm.status = 'ACTIVE'
  ) or exists (
    select 1 from public.support_access_grants sag
    where sag.tenant_id = p_tenant_id and sag.user_id = (select auth.uid())
      and sag.revoked_at is null and now() between sag.starts_at and sag.expires_at
  );
$$;

create or replace function private.has_tenant_role(p_tenant_id uuid, p_role public.membership_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_memberships tm
    join public.membership_roles mr on mr.membership_id = tm.id and mr.tenant_id = tm.tenant_id
    join public.roles r on r.id = mr.role_id and r.tenant_id = mr.tenant_id
    where tm.tenant_id = p_tenant_id and tm.user_id = (select auth.uid()) and tm.status = 'ACTIVE' and r.role = p_role
  );
$$;

create or replace function private.can_view_process(p_tenant_id uuid, p_process_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_tenant_role(p_tenant_id, 'TENANT_ADMIN')
    or exists (
      select 1 from public.processes p
      join public.tenant_memberships tm on tm.tenant_id = p.tenant_id and tm.user_id = (select auth.uid()) and tm.status = 'ACTIVE'
      where p.tenant_id = p_tenant_id and p.id = p_process_id and (
        p.access_scope = 'EVERYONE' or p.guardian_membership_id = tm.id
        or exists (select 1 from public.process_versions pv where pv.process_id = p.id and pv.owner_membership_id = tm.id)
        or exists (select 1 from public.process_contributors pc where pc.process_id = p.id and pc.membership_id = tm.id)
        or exists (select 1 from public.process_version_approvers pa where pa.process_id = p.id and pa.membership_id = tm.id)
        or exists (
          select 1 from public.process_access_rules ar
          where ar.process_id = p.id and ar.tenant_id = p.tenant_id and (
            ar.scope = 'EVERYONE' or ar.membership_id = tm.id or ar.department_id = tm.department_id
            or exists (select 1 from public.membership_roles mr where mr.membership_id = tm.id and mr.role_id = ar.role_id)
          )
        )
      )
    ) or exists (
      select 1 from public.support_access_grants sag where sag.tenant_id = p_tenant_id
      and sag.user_id = (select auth.uid()) and sag.revoked_at is null and now() between sag.starts_at and sag.expires_at
    );
$$;

create or replace function private.can_design_process(p_tenant_id uuid, p_process_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_tenant_role(p_tenant_id, 'TENANT_ADMIN') or exists (
    select 1 from public.processes p join public.tenant_memberships tm on tm.id = p.guardian_membership_id
    where p.tenant_id = p_tenant_id and p.id = p_process_id and tm.user_id = (select auth.uid()) and tm.status = 'ACTIVE'
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, public.membership_role) to authenticated;
grant execute on function private.can_view_process(uuid, uuid) to authenticated;
grant execute on function private.can_design_process(uuid, uuid) to authenticated;

-- Immutability guards.
create or replace function private.reject_history_mutation() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Historical governance records are immutable'; end; $$;

create or replace function private.protect_approved_version() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('APPROVED', 'SCHEDULED', 'ACTIVE', 'SUPERSEDED', 'RETIRED') and (
    new.purpose is distinct from old.purpose or new.business_problem is distinct from old.business_problem or
    new.goal is distinct from old.goal or new.in_scope is distinct from old.in_scope or
    new.out_of_scope is distinct from old.out_of_scope or new.trigger_description is distinct from old.trigger_description or
    new.current_state is distinct from old.current_state or new.diagnosis is distinct from old.diagnosis or
    new.future_state is distinct from old.future_state or new.owner_membership_id is distinct from old.owner_membership_id
  ) then raise exception 'Approved process versions cannot be edited'; end if;
  return new;
end; $$;
create trigger protect_approved_version before update on public.process_versions for each row execute function private.protect_approved_version();

create or replace function private.protect_locked_version_child() returns trigger language plpgsql set search_path = '' as $$
declare v_version_id uuid; v_status public.process_version_status;
begin
  if tg_op = 'DELETE' then v_version_id := old.version_id; else v_version_id := new.version_id; end if;
  select status into v_status from public.process_versions where id = v_version_id;
  if v_status in ('APPROVED', 'SCHEDULED', 'ACTIVE', 'SUPERSEDED', 'RETIRED') then
    raise exception 'Approved process version content is immutable';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
create trigger protect_nodes before insert or update or delete on public.process_nodes for each row execute function private.protect_locked_version_child();
create trigger protect_edges before insert or update or delete on public.process_edges for each row execute function private.protect_locked_version_child();
create trigger protect_metrics before insert or update or delete on public.process_metrics for each row execute function private.protect_locked_version_child();
create trigger protect_rules before insert or update or delete on public.process_rules for each row execute function private.protect_locked_version_child();
create trigger protect_exceptions before insert or update or delete on public.process_exceptions for each row execute function private.protect_locked_version_child();
create trigger protect_checkpoints before insert or update or delete on public.process_audit_checkpoints for each row execute function private.protect_locked_version_child();
create trigger immutable_approval_events before update or delete on public.approval_events for each row execute function private.reject_history_mutation();
create trigger immutable_health_snapshots before update or delete on public.health_snapshots for each row execute function private.reject_history_mutation();
create trigger immutable_activity_logs before update or delete on public.activity_logs for each row execute function private.reject_history_mutation();

create or replace function private.protect_completed_audit() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'COMPLETED' then raise exception 'Completed audits are immutable'; end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
create trigger protect_completed_audit before update or delete on public.audits for each row execute function private.protect_completed_audit();

create or replace function private.protect_completed_audit_item() returns trigger language plpgsql set search_path = '' as $$
declare v_audit_id uuid;
begin
  if tg_op = 'DELETE' then v_audit_id := old.audit_id; else v_audit_id := new.audit_id; end if;
  if exists (select 1 from public.audits where id = v_audit_id and status = 'COMPLETED') then
    raise exception 'Completed audit items are immutable';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
create trigger protect_completed_audit_item before insert or update or delete on public.audit_items for each row execute function private.protect_completed_audit_item();

-- Index every common tenant relationship and queue filter.
create index tenant_memberships_user_idx on public.tenant_memberships(user_id, tenant_id) where status = 'ACTIVE';
create index membership_roles_tenant_idx on public.membership_roles(tenant_id, membership_id);
create index processes_tenant_status_idx on public.processes(tenant_id, retired_at, deleted_at);
create index processes_tenant_health_idx on public.processes(tenant_id, current_health);
create index processes_tenant_audit_idx on public.processes(tenant_id, next_audit_at);
create index process_versions_process_status_idx on public.process_versions(tenant_id, process_id, status);
create index process_nodes_version_idx on public.process_nodes(tenant_id, version_id);
create index process_edges_version_idx on public.process_edges(tenant_id, version_id);
create index approvals_assignee_status_idx on public.approvals(tenant_id, approver_membership_id, status);
create index audits_due_status_idx on public.audits(tenant_id, status, due_at);
create index issues_process_status_idx on public.issues(tenant_id, process_id, status);
create index issues_assignee_status_idx on public.issues(tenant_id, assigned_to, status);
create index change_requests_status_idx on public.change_requests(tenant_id, status, created_at);
create index notifications_member_idx on public.notifications(tenant_id, membership_id, read_at, available_at);
create index activity_logs_entity_idx on public.activity_logs(tenant_id, entity_type, entity_id, created_at desc);
create index attachments_process_idx on public.attachments(tenant_id, process_id, status);

-- Enable database-side tenant isolation on every exposed application table.
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','profiles','platform_admins','tenant_branding','tenant_auth_settings','tenant_domains','departments',
    'tenant_memberships','roles','membership_roles','tenant_invitations','support_access_grants','processes','process_versions',
    'process_nodes','process_edges','process_metrics','process_rules','process_exceptions','process_contributors',
    'process_version_approvers','process_audit_checkpoints','process_access_rules','tags','process_tags','approvals','approval_events',
    'process_releases','implementation_handoffs','implementation_checklist_items','adoption_checks','audits','audit_items',
    'audit_metric_results','health_snapshots','audit_cadence_changes','issues','issue_comments','change_requests',
    'change_request_issues','change_request_comments','governance_notes','attachments','process_attachments','audit_attachments',
    'issue_attachments','change_request_attachments','process_comments','audit_comments','approval_comments','notifications',
    'notification_preferences','activity_logs','user_resume_states','search_documents','api_rate_limits','ai_threads','ai_messages',
    'ai_citations','ai_suggestions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Tenant directory/configuration policies.
create policy tenants_member_select on public.tenants for select to authenticated using ((select private.is_tenant_member(id)));
create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy memberships_tenant_select on public.tenant_memberships for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy roles_tenant_select on public.roles for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy membership_roles_tenant_select on public.membership_roles for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy departments_tenant_select on public.departments for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy branding_tenant_select on public.tenant_branding for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy auth_settings_tenant_select on public.tenant_auth_settings for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy tenant_admin_branding_all on public.tenant_branding for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_auth_all on public.tenant_auth_settings for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_domains_all on public.tenant_domains for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_departments_all on public.departments for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_memberships_all on public.tenant_memberships for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_roles_all on public.roles for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_membership_roles_all on public.membership_roles for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));
create policy tenant_admin_invitations_all on public.tenant_invitations for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')));

-- Process-scoped read and design policies. All tables include process_id specifically to keep policies indexable.
do $$
declare t text;
begin
  foreach t in array array[
    'process_versions','process_nodes','process_edges','process_metrics','process_rules','process_exceptions',
    'process_contributors','process_version_approvers','process_audit_checkpoints','process_access_rules','process_tags',
    'approvals','approval_events','process_releases','implementation_handoffs','implementation_checklist_items','adoption_checks',
    'audits','audit_items','audit_metric_results','health_snapshots','audit_cadence_changes','issues','issue_comments',
    'change_requests','change_request_issues','change_request_comments','attachments','process_attachments','audit_attachments',
    'issue_attachments','change_request_attachments','process_comments','audit_comments','approval_comments'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.can_view_process(tenant_id, process_id)))', t || '_process_select', t);
  end loop;
end $$;
create policy processes_process_select on public.processes for select to authenticated using ((select private.can_view_process(tenant_id, id)));
create policy processes_design_insert on public.processes for insert to authenticated with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')) or (select private.has_tenant_role(tenant_id, 'PROCESS_GUARDIAN')));
create policy processes_design_update on public.processes for update to authenticated using ((select private.can_design_process(tenant_id, id))) with check ((select private.can_design_process(tenant_id, id)));
create policy versions_design_all on public.process_versions for all to authenticated using ((select private.can_design_process(tenant_id, process_id))) with check ((select private.can_design_process(tenant_id, process_id)));
do $$
declare t text;
begin
  foreach t in array array['process_nodes','process_edges','process_metrics','process_rules','process_exceptions','process_contributors','process_version_approvers','process_audit_checkpoints','process_access_rules','process_tags','process_releases','implementation_handoffs','implementation_checklist_items','adoption_checks','audits','audit_items','audit_metric_results','health_snapshots','audit_cadence_changes','issues','change_requests','change_request_issues'] loop
    execute format('create policy %I on public.%I for all to authenticated using ((select private.can_design_process(tenant_id, process_id))) with check ((select private.can_design_process(tenant_id, process_id)))', t || '_guardian_all', t);
  end loop;
end $$;
create policy process_comments_insert on public.process_comments for insert to authenticated with check ((select private.can_view_process(tenant_id, process_id)) and author_id = (select auth.uid()));
create policy issue_comments_insert on public.issue_comments for insert to authenticated with check ((select private.can_view_process(tenant_id, process_id)) and author_id = (select auth.uid()));
create policy change_comments_insert on public.change_request_comments for insert to authenticated with check ((select private.can_view_process(tenant_id, process_id)) and author_id = (select auth.uid()));
create policy audit_comments_insert on public.audit_comments for insert to authenticated with check ((select private.can_view_process(tenant_id, process_id)) and author_id = (select auth.uid()));
create policy approval_comments_insert on public.approval_comments for insert to authenticated with check ((select private.can_view_process(tenant_id, process_id)) and author_id = (select auth.uid()));

-- Tenant-wide governance, search, notification and AI policies.
create policy governance_notes_member_select on public.governance_notes for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy governance_notes_guardian_all on public.governance_notes for all to authenticated using ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')) or (select private.has_tenant_role(tenant_id, 'PROCESS_GUARDIAN'))) with check ((select private.has_tenant_role(tenant_id, 'TENANT_ADMIN')) or (select private.has_tenant_role(tenant_id, 'PROCESS_GUARDIAN')));
create policy tags_member_select on public.tags for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy search_permission_select on public.search_documents for select to authenticated using ((process_id is null and (select private.is_tenant_member(tenant_id))) or (process_id is not null and (select private.can_view_process(tenant_id, process_id))));
create policy notifications_own_select on public.notifications for select to authenticated using (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = notifications.tenant_id));
create policy notifications_own_update on public.notifications for update to authenticated using (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = notifications.tenant_id)) with check (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = notifications.tenant_id));
create policy resume_own_all on public.user_resume_states for all to authenticated using (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = user_resume_states.tenant_id)) with check (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = user_resume_states.tenant_id));
create policy ai_threads_own_all on public.ai_threads for all to authenticated using (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = ai_threads.tenant_id)) with check (exists (select 1 from public.tenant_memberships tm where tm.id = membership_id and tm.user_id = (select auth.uid()) and tm.tenant_id = ai_threads.tenant_id));
create policy ai_messages_thread_select on public.ai_messages for select to authenticated using (exists (select 1 from public.ai_threads t join public.tenant_memberships tm on tm.id = t.membership_id where t.id = thread_id and t.tenant_id = ai_messages.tenant_id and tm.user_id = (select auth.uid())));
create policy ai_citations_message_select on public.ai_citations for select to authenticated using (exists (select 1 from public.ai_messages m join public.ai_threads t on t.id = m.thread_id join public.tenant_memberships tm on tm.id = t.membership_id where m.id = message_id and m.tenant_id = ai_citations.tenant_id and tm.user_id = (select auth.uid())));
create policy ai_suggestions_owner_select on public.ai_suggestions for select to authenticated using (created_by = (select auth.uid()) and (select private.is_tenant_member(tenant_id)));
create policy activity_member_select on public.activity_logs for select to authenticated using ((select private.is_tenant_member(tenant_id)));

-- Public API access is explicit. Anon receives no application-table privileges.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tenant-branding', 'tenant-branding', true, 5242880, array['image/png','image/jpeg','image/webp','image/x-icon']),
  ('evidence', 'evidence', false, 26214400, array['image/png','image/jpeg','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy branding_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'tenant-branding');
-- Evidence has intentionally no direct client SELECT policy. The server verifies metadata permission and issues a 60-second signed URL.

comment on schema private is 'RLS helpers and integrity functions; never expose through the Data API.';
comment on table public.process_versions is 'Versioned process content. Approved and later content is immutable.';
comment on table public.search_documents is 'Permission-filtered search projection; never query with a service-role client for end-user requests.';
