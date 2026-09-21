begin;
select plan(14);

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
select is(public.respond_to_process_approval('c0000000-0000-4000-8000-000000000001','APPROVED','I reviewed Purchase Approval version 2.1 and approve this release.',null),'APPROVED'::public.approval_status,'Assigned approver can approve the current revision');
select is((select status from public.process_versions where id='60000000-0000-4000-8000-000000000003'),'APPROVED'::public.process_version_status,'Approval locks the exact process version');
select is((select status from public.process_releases where version_id='60000000-0000-4000-8000-000000000003'),'APPROVED'::public.release_status,'Approval finalizes the release snapshot');
select is((select count(*) from public.approval_events where approval_id='c0000000-0000-4000-8000-000000000001'),1::bigint,'Approval creates one immutable event');
select throws_ok($$select public.respond_to_process_approval('c0000000-0000-4000-8000-000000000001','APPROVED','I reviewed this exact release again.',null)$$,'This approval is no longer current','Stale approval is rejected');
set local role service_role;
select throws_ok($$update public.process_versions set purpose='silent edit' where id='60000000-0000-4000-8000-000000000003'$$,'Approved process versions cannot be edited','Approved content remains immutable');

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
update public.audit_items set followed='YES',evidence_available='YES',sla_met='YES',exception_occurred=false where audit_id='80000000-0000-4000-8000-000000000002';
select is(public.complete_process_audit('80000000-0000-4000-8000-000000000002'),'HEALTHY'::public.health_status,'Completed checkpoint evidence calculates process health');
select is((select count(*) from public.health_snapshots where audit_id='80000000-0000-4000-8000-000000000002'),1::bigint,'Audit completion creates a historical health snapshot');
select cmp_ok((select next_audit_at from public.processes where id='50000000-0000-4000-8000-000000000001'),'>',(select completed_at from public.audits where id='80000000-0000-4000-8000-000000000002'),'Next audit is scheduled after completion');
select ok((select public.clone_process_version('50000000-0000-4000-8000-000000000001','Improve the weekly evidence check','IMPROVEMENT') is not null),'Guardian can clone an active version into a traced draft');

set local role service_role;
delete from public.process_versions where process_id='50000000-0000-4000-8000-000000000001' and status='DRAFT';
insert into public.change_requests(id,tenant_id,process_id,problem_observed,evidence_summary,proposed_change,expected_effect,requested_by,reviewer_membership_id,status)
values('af000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Weekly evidence is repeatedly incomplete.','Three audit findings.','Add an accountable evidence handoff.','Complete evidence before review.','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','PROPOSED');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
select ok(public.respond_to_change_request('af000000-0000-4000-8000-000000000001','APPROVED','Approved after reviewing the linked audit evidence.') is not null,'Assigned Approver can approve a Change Request');
select is((select status from public.change_requests where id='af000000-0000-4000-8000-000000000001'),'APPROVED'::public.change_request_status,'Change Request records the approval');
select is((select pv.status from public.process_versions pv join public.change_requests cr on cr.created_version_id=pv.id where cr.id='af000000-0000-4000-8000-000000000001'),'DRAFT'::public.process_version_status,'Change Request approval atomically creates a linked minor draft');

select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000008',true);
select throws_ok($$select public.clone_process_version('50000000-0000-4000-8000-000000000001','Cross tenant attempt','IMPROVEMENT')$$,'Process not found','Another tenant cannot create a process version');

select * from finish();
rollback;
