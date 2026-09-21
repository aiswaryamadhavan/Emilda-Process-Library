-- Atomic governance workflows. These functions re-check auth.uid() and never accept tenant_id from the browser.
create or replace function public.clone_process_version(
  p_process_id uuid,
  p_change_reason text,
  p_kind text default 'IMPROVEMENT'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.process_versions;
  v_new_id uuid := gen_random_uuid();
  v_new_major integer;
  v_new_minor integer;
  v_tenant_id uuid;
begin
  if length(trim(p_change_reason)) < 3 then raise exception 'A change reason is required'; end if;
  select tenant_id into v_tenant_id from public.processes where id = p_process_id and deleted_at is null;
  if v_tenant_id is null or not (
    private.can_design_process(v_tenant_id, p_process_id)
    or exists (
      select 1
      from public.change_requests cr
      join public.tenant_memberships tm
        on tm.id = cr.reviewer_membership_id
       and tm.tenant_id = cr.tenant_id
      where cr.tenant_id = v_tenant_id
        and cr.process_id = p_process_id
        and cr.status = 'APPROVED'
        and cr.created_version_id is null
        and tm.user_id = auth.uid()
        and tm.status = 'ACTIVE'
    )
  ) then raise exception 'Process not found'; end if;
  select * into v_source from public.process_versions where process_id = p_process_id and status = 'ACTIVE' order by major_version desc, minor_version desc limit 1;
  if v_source.id is null then raise exception 'An active source version is required'; end if;
  if p_kind = 'REDESIGN' then v_new_major := v_source.major_version + 1; v_new_minor := 0;
  elsif p_kind = 'IMPROVEMENT' then v_new_major := v_source.major_version; v_new_minor := v_source.minor_version + 1;
  else raise exception 'Change kind must be IMPROVEMENT or REDESIGN'; end if;

  insert into public.process_versions (
    id, tenant_id, process_id, major_version, minor_version, source_version_id, status, change_reason,
    purpose, business_problem, goal, in_scope, out_of_scope, trigger_description, current_state,
    diagnosis, future_state, constraints, owner_membership_id, design_stage, created_by
  ) values (
    v_new_id, v_tenant_id, p_process_id, v_new_major, v_new_minor, v_source.id, 'DRAFT', trim(p_change_reason),
    v_source.purpose, v_source.business_problem, v_source.goal, v_source.in_scope, v_source.out_of_scope,
    v_source.trigger_description, v_source.current_state, v_source.diagnosis, v_source.future_state,
    v_source.constraints, v_source.owner_membership_id, v_source.design_stage, auth.uid()
  );

  insert into public.process_nodes (id, tenant_id, process_id, version_id, node_key, node_type, title, actor_membership_id, action_text, timing, why, tool, evidence, dependency, exception_text, escalation, position_x, position_y, sort_order, metadata)
    select gen_random_uuid(), v_tenant_id, p_process_id, v_new_id, node_key, node_type, title, actor_membership_id, action_text, timing, why, tool, evidence, dependency, exception_text, escalation, position_x, position_y, sort_order, metadata
    from public.process_nodes where version_id = v_source.id order by sort_order;
  insert into public.process_edges (tenant_id, process_id, version_id, source_node_id, target_node_id, label, sort_order)
    select v_tenant_id, p_process_id, v_new_id, new_source.id, new_target.id, e.label, e.sort_order
    from public.process_edges e
    join public.process_nodes old_source on old_source.id=e.source_node_id
    join public.process_nodes old_target on old_target.id=e.target_node_id
    join public.process_nodes new_source on new_source.version_id=v_new_id and new_source.node_key=old_source.node_key
    join public.process_nodes new_target on new_target.version_id=v_new_id and new_target.node_key=old_target.node_key
    where e.version_id = v_source.id;
  insert into public.process_metrics (tenant_id, process_id, version_id, name, target, unit, cadence, data_source, sort_order)
    select v_tenant_id, p_process_id, v_new_id, name, target, unit, cadence, data_source, sort_order from public.process_metrics where version_id = v_source.id;
  insert into public.process_rules (tenant_id, process_id, version_id, title, description, sort_order)
    select v_tenant_id, p_process_id, v_new_id, title, description, sort_order from public.process_rules where version_id = v_source.id;
  insert into public.process_exceptions (tenant_id, process_id, version_id, scenario, response, escalation, sort_order)
    select v_tenant_id, p_process_id, v_new_id, scenario, response, escalation, sort_order from public.process_exceptions where version_id = v_source.id;
  insert into public.process_contributors (tenant_id, process_id, version_id, membership_id, responsibility)
    select v_tenant_id, p_process_id, v_new_id, membership_id, responsibility from public.process_contributors where version_id = v_source.id;
  insert into public.process_version_approvers (tenant_id, process_id, version_id, membership_id)
    select v_tenant_id, p_process_id, v_new_id, membership_id from public.process_version_approvers where version_id = v_source.id;
  insert into public.process_audit_checkpoints (tenant_id, process_id, version_id, node_id, question, evidence_required, sla_applicable, exception_applicable, is_critical, sort_order)
    select v_tenant_id, p_process_id, v_new_id, new_node.id, c.question, c.evidence_required, c.sla_applicable, c.exception_applicable, c.is_critical, c.sort_order
    from public.process_audit_checkpoints c
    join public.process_nodes old_node on old_node.id=c.node_id
    join public.process_nodes new_node on new_node.version_id=v_new_id and new_node.node_key=old_node.node_key
    where c.version_id = v_source.id;
  insert into public.activity_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_tenant_id, auth.uid(), 'PROCESS_VERSION_CREATED', 'PROCESS_VERSION', v_new_id, jsonb_build_object('source_version_id', v_source.id, 'change_reason', trim(p_change_reason)));
  return v_new_id;
end;
$$;

create or replace function public.can_design_process_action(p_process_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select private.can_design_process(tenant_id,id) from public.processes where id=p_process_id and deleted_at is null),false);
$$;

create or replace function public.respond_to_process_approval(
  p_approval_id uuid,
  p_decision public.approval_status,
  p_acknowledgement_text text,
  p_note text default null
) returns public.approval_status
language plpgsql
security definer
set search_path = ''
as $$
declare v_approval public.approvals; v_version public.process_versions; v_membership uuid; v_all_approved boolean;
begin
  if p_decision not in ('APPROVED', 'CHANGES_REQUESTED') then raise exception 'Unsupported approval decision'; end if;
  select * into v_approval from public.approvals where id = p_approval_id for update;
  if v_approval.id is null then raise exception 'Approval not found'; end if;
  select id into v_membership from public.tenant_memberships where tenant_id = v_approval.tenant_id and user_id = auth.uid() and status = 'ACTIVE';
  if v_membership is null or v_membership <> v_approval.approver_membership_id then raise exception 'Approval not found'; end if;
  select * into v_version from public.process_versions where id = v_approval.version_id for update;
  if v_approval.status <> 'PENDING' or v_version.status <> 'APPROVAL_PENDING' or v_version.content_revision <> v_approval.content_revision then raise exception 'This approval is no longer current'; end if;
  if p_decision = 'APPROVED' and length(trim(coalesce(p_acknowledgement_text, ''))) < 10 then raise exception 'Acknowledgement text is required'; end if;
  update public.approvals set status = p_decision, responded_at = now(), note = nullif(trim(p_note), '') where id = p_approval_id;
  insert into public.approval_events (tenant_id, process_id, version_id, approval_id, actor_id, event_type, content_revision, acknowledgement_text, note)
    values (v_approval.tenant_id, v_approval.process_id, v_approval.version_id, p_approval_id, auth.uid(), p_decision::text, v_approval.content_revision, p_acknowledgement_text, nullif(trim(p_note), ''));
  if p_decision = 'CHANGES_REQUESTED' then
    update public.process_versions set status = 'CHANGES_REQUESTED', updated_at = now() where id = v_approval.version_id;
    update public.process_releases set status = 'CHANGES_REQUESTED', updated_at = now() where version_id = v_approval.version_id;
  else
    select not exists (select 1 from public.approvals where version_id = v_approval.version_id and content_revision = v_approval.content_revision and status <> 'APPROVED') into v_all_approved;
    if v_all_approved then
      update public.process_versions set status = 'APPROVED', approved_at = now(), updated_at = now() where id = v_approval.version_id;
      insert into public.process_releases (tenant_id, process_id, version_id, status, snapshot, snapshot_hash, approved_at, created_by)
      values (v_approval.tenant_id, v_approval.process_id, v_approval.version_id, 'APPROVED', jsonb_build_object('version_id', v_approval.version_id, 'content_revision', v_approval.content_revision, 'approved_at', now()), encode(extensions.digest(v_approval.version_id::text || ':' || v_approval.content_revision::text, 'sha256'), 'hex'), now(), auth.uid())
      on conflict (version_id) do update set status = 'APPROVED', snapshot = excluded.snapshot, snapshot_hash = excluded.snapshot_hash, approved_at = excluded.approved_at, updated_at = now();
    end if;
  end if;
  insert into public.activity_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_approval.tenant_id, auth.uid(), 'PROCESS_APPROVAL_' || p_decision::text, 'PROCESS_VERSION', v_approval.version_id, jsonb_build_object('approval_id', p_approval_id, 'content_revision', v_approval.content_revision));
  return p_decision;
end;
$$;

-- Replace a draft graph in one transaction. Any bad node or edge rolls the complete write back.
create or replace function public.save_process_graph(p_process_id uuid,p_version_id uuid,p_graph jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_version public.process_versions; v_node jsonb; v_edge jsonb; v_index integer:=0;
begin
  select * into v_version from public.process_versions where id=p_version_id and process_id=p_process_id for update;
  if v_version.id is null or v_version.status not in ('DRAFT','CHANGES_REQUESTED') or not private.can_design_process(v_version.tenant_id,p_process_id) then raise exception 'Editable process draft not found'; end if;
  if jsonb_typeof(p_graph->'nodes')<>'array' or jsonb_array_length(p_graph->'nodes')<2 or jsonb_typeof(p_graph->'edges')<>'array' then raise exception 'Invalid process graph'; end if;
  delete from public.process_edges where version_id=p_version_id;
  delete from public.process_nodes where version_id=p_version_id;
  for v_node in select value from jsonb_array_elements(p_graph->'nodes') loop
    insert into public.process_nodes(id,tenant_id,process_id,version_id,node_key,node_type,title,action_text,timing,why,evidence,position_x,position_y,sort_order)
      values(gen_random_uuid(),v_version.tenant_id,p_process_id,p_version_id,v_node->>'id',(v_node->>'type')::public.process_node_type,v_node->>'title',nullif(v_node->>'action',''),nullif(v_node->>'timing',''),nullif(v_node->>'why',''),nullif(v_node->>'evidence',''),coalesce((v_node->'position'->>'x')::numeric,0),coalesce((v_node->'position'->>'y')::numeric,0),v_index);
    v_index:=v_index+1;
  end loop;
  v_index:=0;
  for v_edge in select value from jsonb_array_elements(p_graph->'edges') loop
    insert into public.process_edges(tenant_id,process_id,version_id,source_node_id,target_node_id,label,sort_order)
      values(v_version.tenant_id,p_process_id,p_version_id,(select id from public.process_nodes where version_id=p_version_id and node_key=v_edge->>'source'),(select id from public.process_nodes where version_id=p_version_id and node_key=v_edge->>'target'),nullif(v_edge->>'label',''),v_index);
    v_index:=v_index+1;
  end loop;
  update public.process_versions set updated_at=now() where id=p_version_id;
  insert into public.activity_logs(tenant_id,actor_id,action,entity_type,entity_id,metadata) values(v_version.tenant_id,auth.uid(),'PROCESS_GRAPH_UPDATED','PROCESS_VERSION',p_version_id,jsonb_build_object('nodes',jsonb_array_length(p_graph->'nodes'),'edges',jsonb_array_length(p_graph->'edges')));
end; $$;

-- Approved history cannot be deleted, and finalized snapshots cannot be rewritten.
create or replace function private.protect_locked_version_delete() returns trigger language plpgsql set search_path = '' as $$
begin if old.status <> 'DRAFT' then raise exception 'Historical process versions cannot be deleted'; end if; return old; end; $$;
create trigger protect_locked_version_delete before delete on public.process_versions for each row execute function private.protect_locked_version_delete();

create or replace function private.protect_final_release() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('APPROVED','SCHEDULED','ACTIVE') then raise exception 'Final releases cannot be deleted'; end if;
    return old;
  end if;
  if old.status in ('APPROVED','SCHEDULED','ACTIVE') and (new.snapshot is distinct from old.snapshot or new.snapshot_hash is distinct from old.snapshot_hash or new.version_id is distinct from old.version_id) then raise exception 'Final release snapshots are immutable'; end if;
  return new;
end; $$;
create trigger protect_final_release before update or delete on public.process_releases for each row execute function private.protect_final_release();

create or replace function private.protect_published_note() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'PUBLISHED' then raise exception 'Published Governance Notes are immutable; create a new revision'; end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
create trigger protect_published_note before update or delete on public.governance_notes for each row execute function private.protect_published_note();

create or replace function public.complete_process_audit(p_audit_id uuid)
returns public.health_status
language plpgsql security definer set search_path = '' as $$
declare
  v_audit public.audits;
  v_adherence numeric; v_evidence numeric; v_sla numeric; v_outcome numeric; v_issues numeric;
  v_weight numeric := 10; v_total numeric; v_score numeric; v_coverage numeric;
  v_forced_critical boolean; v_health public.health_status; v_next timestamptz; v_frequency public.audit_frequency; v_custom integer;
begin
  select * into v_audit from public.audits where id=p_audit_id for update;
  if v_audit.id is null or not (private.can_design_process(v_audit.tenant_id,v_audit.process_id) or private.has_tenant_role(v_audit.tenant_id,'AUDITOR')) then raise exception 'Audit not found'; end if;
  if v_audit.status <> 'DRAFT' then raise exception 'This audit is already historical'; end if;
  if exists (select 1 from public.audit_items where audit_id=p_audit_id and followed is null) then raise exception 'Complete every checkpoint before finishing the audit'; end if;
  select avg(case followed when 'YES' then 1 when 'PARTIALLY' then .5 when 'NO' then 0 end) filter (where followed <> 'NOT_APPLICABLE'),
         avg(case evidence_available when 'YES' then 1 when 'NO' then 0 end) filter (where evidence_available <> 'NOT_APPLICABLE'),
         avg(case sla_met when 'YES' then 1 when 'NO' then 0 end) filter (where sla_met <> 'NOT_APPLICABLE'),
         bool_or(is_critical and followed='NO')
    into v_adherence,v_evidence,v_sla,v_forced_critical from public.audit_items where audit_id=p_audit_id;
  select avg(case result when 'MET' then 1 when 'AT_RISK' then .5 when 'MISSED' then 0 end) into v_outcome from public.audit_metric_results where audit_id=p_audit_id;
  v_issues := case
    when exists(select 1 from public.issues where process_id=v_audit.process_id and status not in ('VERIFIED','CLOSED') and severity='CRITICAL') then 0
    when exists(select 1 from public.issues where process_id=v_audit.process_id and status not in ('VERIFIED','CLOSED') and severity='HIGH') then .3
    when exists(select 1 from public.issues where process_id=v_audit.process_id and status not in ('VERIFIED','CLOSED') and severity='MEDIUM') then .65
    when exists(select 1 from public.issues where process_id=v_audit.process_id and status not in ('VERIFIED','CLOSED') and severity='LOW') then .85 else 1 end;
  v_forced_critical := coalesce(v_forced_critical,false) or v_issues=0;
  v_total := v_issues*10;
  if v_adherence is not null then v_weight:=v_weight+35; v_total:=v_total+v_adherence*35; end if;
  if v_outcome is not null then v_weight:=v_weight+30; v_total:=v_total+v_outcome*30; end if;
  if v_evidence is not null then v_weight:=v_weight+15; v_total:=v_total+v_evidence*15; end if;
  if v_sla is not null then v_weight:=v_weight+10; v_total:=v_total+v_sla*10; end if;
  v_coverage:=v_weight/100; v_score:=round(v_total/v_weight*100,2);
  v_health:=case when v_coverage<.5 then 'NOT_ENOUGH_DATA'::public.health_status when v_forced_critical or v_score<60 then 'CRITICAL'::public.health_status when v_score<85 then 'NEEDS_ATTENTION'::public.health_status else 'HEALTHY'::public.health_status end;
  update public.audits set status='COMPLETED',completed_at=now(),calculated_health=v_health,calculated_score=v_score,data_coverage=v_coverage where id=p_audit_id;
  insert into public.health_snapshots (tenant_id,process_id,audit_id,calculated_health,displayed_health,score,data_coverage,factors)
    values(v_audit.tenant_id,v_audit.process_id,p_audit_id,v_health,v_health,v_score,v_coverage,jsonb_build_object('adherence',v_adherence,'outcome',v_outcome,'evidence',v_evidence,'sla',v_sla,'issues',v_issues));
  select audit_frequency,custom_interval_days,coalesce(next_audit_at,now()) into v_frequency,v_custom,v_next from public.processes where id=v_audit.process_id for update;
  while v_next<=now() loop v_next:=case v_frequency when 'WEEKLY' then v_next+interval '7 days' when 'BIWEEKLY' then v_next+interval '14 days' when 'MONTHLY' then v_next+interval '1 month' when 'QUARTERLY' then v_next+interval '3 months' else v_next+make_interval(days=>coalesce(v_custom,30)) end; end loop;
  update public.processes set current_health=v_health,next_audit_at=v_next,updated_at=now() where id=v_audit.process_id;
  insert into public.activity_logs(tenant_id,actor_id,action,entity_type,entity_id,metadata) values(v_audit.tenant_id,auth.uid(),'AUDIT_COMPLETED','AUDIT',p_audit_id,jsonb_build_object('health',v_health,'score',v_score,'next_audit_at',v_next));
  return v_health;
end; $$;

-- An assigned Approver decides the improvement and approval creates the traced draft atomically.
create or replace function public.respond_to_change_request(
  p_change_request_id uuid,
  p_decision public.change_request_status,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.change_requests;
  v_membership uuid;
  v_version_id uuid;
begin
  if p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'Unsupported Change Request decision';
  end if;

  select * into v_request
  from public.change_requests
  where id = p_change_request_id
  for update;

  if v_request.id is null then raise exception 'Change Request not found'; end if;

  select tm.id into v_membership
  from public.tenant_memberships tm
  where tm.tenant_id = v_request.tenant_id
    and tm.user_id = auth.uid()
    and tm.status = 'ACTIVE';

  if v_membership is null
    or v_membership <> v_request.reviewer_membership_id
    or not private.has_tenant_role(v_request.tenant_id, 'APPROVER') then
    raise exception 'Change Request not found';
  end if;

  if v_request.status not in ('PROPOSED', 'UNDER_REVIEW')
    or v_request.created_version_id is not null then
    raise exception 'This Change Request is no longer current';
  end if;

  update public.change_requests
  set status = p_decision,
      reviewed_at = now()
  where id = v_request.id;

  if p_decision = 'APPROVED' then
    v_version_id := public.clone_process_version(
      v_request.process_id,
      'Change Request: ' || v_request.problem_observed,
      'IMPROVEMENT'
    );
    update public.change_requests
    set created_version_id = v_version_id
    where id = v_request.id;
  end if;

  insert into public.change_request_comments(
    tenant_id, process_id, change_request_id, author_id, body
  )
  select v_request.tenant_id, v_request.process_id, v_request.id, auth.uid(), trim(p_note)
  where nullif(trim(coalesce(p_note, '')), '') is not null;

  insert into public.activity_logs(
    tenant_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    v_request.tenant_id,
    auth.uid(),
    'CHANGE_REQUEST_' || p_decision::text,
    'CHANGE_REQUEST',
    v_request.id,
    jsonb_build_object('created_version_id', v_version_id)
  );

  return v_version_id;
end; $$;

create or replace function public.activate_due_releases() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_release public.process_releases; v_old uuid; v_count integer:=0;
begin
  for v_release in select r.* from public.process_releases r join public.implementation_handoffs h on h.version_id=r.version_id and h.tenant_id=r.tenant_id where r.status='SCHEDULED' and r.go_live_at<=now() and h.go_live_decision=true for update of r skip locked loop
    if exists(select 1 from public.approvals a where a.version_id=v_release.version_id and a.status<>'APPROVED') then continue; end if;
    select current_active_version_id into v_old from public.processes where id=v_release.process_id for update;
    if v_old is not null and v_old<>v_release.version_id then update public.process_versions set status='SUPERSEDED',retirement_at=coalesce(v_release.old_process_stops_at,now()),updated_at=now() where id=v_old and status='ACTIVE'; end if;
    update public.process_versions set status='ACTIVE',effective_at=coalesce(v_release.go_live_at,now()),updated_at=now() where id=v_release.version_id and status='SCHEDULED';
    update public.processes set current_active_version_id=v_release.version_id,updated_at=now() where id=v_release.process_id;
    update public.process_releases set status='ACTIVE',activated_at=now(),updated_at=now() where id=v_release.id;
    insert into public.activity_logs(tenant_id,action,entity_type,entity_id,metadata) values(v_release.tenant_id,'PROCESS_WENT_LIVE','PROCESS_VERSION',v_release.version_id,jsonb_build_object('replaced_version_id',v_old));
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;

create or replace function public.provision_tenant(
  p_name text,
  p_slug text,
  p_primary text,
  p_accent text,
  p_google boolean,
  p_microsoft boolean,
  p_invite_email text,
  p_invite_roles public.membership_role[],
  p_access_scope text,
  p_first_process text
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_role public.membership_role; v_process_id uuid:=gen_random_uuid();
begin
  if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Platform administrator access required'; end if;
  if length(trim(p_name))<2 or p_slug !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' or p_primary !~ '^#[0-9A-Fa-f]{6}$' or p_accent !~ '^#[0-9A-Fa-f]{6}$' or not (p_google or p_microsoft) or p_invite_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or coalesce(array_length(p_invite_roles,1),0)=0 or p_access_scope not in ('EVERYONE','RESTRICTED') or length(trim(p_first_process))<2 then raise exception 'Tenant configuration is invalid'; end if;
  insert into public.tenants(id,name,slug) values(v_id,trim(p_name),p_slug);
  insert into public.tenant_branding(tenant_id,primary_color,accent_color) values(v_id,p_primary,p_accent);
  insert into public.tenant_auth_settings(tenant_id,google_enabled,microsoft_enabled,email_enabled) values(v_id,p_google,p_microsoft,false);
  foreach v_role in array enum_range(null::public.membership_role) loop insert into public.roles(tenant_id,role) values(v_id,v_role); end loop;
  insert into public.tenant_invitations(tenant_id,email,invited_by,token_hash,requested_roles,expires_at)
    values(v_id,lower(trim(p_invite_email)),auth.uid(),encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),p_invite_roles,now()+interval '7 days');
  insert into public.processes(id,tenant_id,process_key,name,access_scope,created_by)
    values(v_process_id,v_id,trim(both '-' from regexp_replace(lower(trim(p_first_process)),'[^a-z0-9]+','-','g')),trim(p_first_process),p_access_scope,auth.uid());
  insert into public.process_versions(tenant_id,process_id,major_version,minor_version,status,change_reason,design_stage,created_by)
    values(v_id,v_process_id,1,0,'DRAFT','Initial process design',1,auth.uid());
  insert into public.activity_logs(tenant_id,actor_id,action,entity_type,entity_id,metadata) values(v_id,auth.uid(),'TENANT_CREATED','TENANT',v_id,jsonb_build_object('slug',p_slug));
  return v_id;
end; $$;

revoke all on function public.clone_process_version(uuid, text, text) from public, anon;
revoke all on function public.can_design_process_action(uuid) from public, anon;
revoke all on function public.respond_to_process_approval(uuid, public.approval_status, text, text) from public, anon;
revoke all on function public.save_process_graph(uuid,uuid,jsonb) from public, anon;
revoke all on function public.complete_process_audit(uuid) from public, anon;
revoke all on function public.respond_to_change_request(uuid, public.change_request_status, text) from public, anon;
revoke all on function public.activate_due_releases() from public, anon, authenticated;
revoke all on function public.provision_tenant(text,text,text,text,boolean,boolean,text,public.membership_role[],text,text) from public, anon;
grant execute on function public.clone_process_version(uuid, text, text) to authenticated;
grant execute on function public.can_design_process_action(uuid) to authenticated;
grant execute on function public.respond_to_process_approval(uuid, public.approval_status, text, text) to authenticated;
grant execute on function public.save_process_graph(uuid,uuid,jsonb) to authenticated;
grant execute on function public.complete_process_audit(uuid) to authenticated;
grant execute on function public.respond_to_change_request(uuid, public.change_request_status, text) to authenticated;
grant execute on function public.activate_due_releases() to service_role;
grant execute on function public.provision_tenant(text,text,text,text,boolean,boolean,text,public.membership_role[],text,text) to authenticated;
revoke update, delete on public.approvals from authenticated;
revoke update, delete on public.approval_events from authenticated;
revoke delete on public.process_versions from authenticated;
