-- A process is retained for governance/audit traceability, but is removed from
-- normal library views. Only an unapproved draft without operational history is
-- eligible; live processes must be retired through the release workflow.
create or replace function public.soft_delete_draft_process(p_process_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id
  from public.processes
  where id = p_process_id and deleted_at is null
  for update;

  if v_tenant_id is null then
    raise exception 'Process not found';
  end if;

  if not private.can_design_process(v_tenant_id, p_process_id) then
    raise exception 'Not permitted to delete this process';
  end if;

  if exists (
    select 1
    from public.process_versions
    where tenant_id = v_tenant_id
      and process_id = p_process_id
      and deleted_at is null
      and status <> 'DRAFT'
  ) then
    raise exception 'Only an unapproved draft process can be deleted';
  end if;

  if exists (
    select 1 from public.audits
    where tenant_id = v_tenant_id and process_id = p_process_id
  ) or exists (
    select 1 from public.approvals
    where tenant_id = v_tenant_id and process_id = p_process_id
  ) or exists (
    select 1 from public.issues
    where tenant_id = v_tenant_id and process_id = p_process_id
  ) then
    raise exception 'A process with governance history cannot be deleted';
  end if;

  update public.process_versions
  set deleted_at = now(), updated_at = now()
  where tenant_id = v_tenant_id
    and process_id = p_process_id
    and deleted_at is null;

  update public.processes
  set deleted_at = now(), updated_at = now()
  where tenant_id = v_tenant_id and id = p_process_id;

  insert into public.activity_logs (
    tenant_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    v_tenant_id, auth.uid(), 'PROCESS_DRAFT_DELETED', 'PROCESS', p_process_id,
    jsonb_build_object('mode', 'soft_delete')
  );
end;
$$;

revoke all on function public.soft_delete_draft_process(uuid) from public, anon;
grant execute on function public.soft_delete_draft_process(uuid) to authenticated;

notify pgrst, 'reload schema';
