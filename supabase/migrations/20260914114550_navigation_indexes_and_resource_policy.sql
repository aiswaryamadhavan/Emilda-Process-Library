-- Keep the high-frequency tenant shell and process summary lookups fast as
-- clients accumulate support history and audits.
create index support_access_grants_active_lookup_idx
  on public.support_access_grants(tenant_id, user_id, expires_at desc)
  where revoked_at is null;

create index audits_latest_completed_process_idx
  on public.audits(tenant_id, process_id, completed_at desc)
  where status = 'COMPLETED';

-- Avoid evaluating overlapping permissive SELECT policies. Reading is based
-- on process visibility; each mutation independently requires design access.
drop policy process_resource_links_guardian_all
  on public.process_resource_links;

create policy process_resource_links_guardian_insert
on public.process_resource_links for insert
to authenticated
with check ((select private.can_design_process(tenant_id, process_id)));

create policy process_resource_links_guardian_update
on public.process_resource_links for update
to authenticated
using ((select private.can_design_process(tenant_id, process_id)))
with check ((select private.can_design_process(tenant_id, process_id)));

create policy process_resource_links_guardian_delete
on public.process_resource_links for delete
to authenticated
using ((select private.can_design_process(tenant_id, process_id)));
