-- Idempotent local demo data. Password for every demo account: EmildaDemo!2026
-- Seeding runs as the local postgres superuser; bypass application triggers only for fixture reconciliation.
set session_replication_role = replica;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Priya Nair"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000002','authenticated','authenticated','guardian@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Vishnu Rao"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000003','authenticated','authenticated','owner@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Aishwarya Menon"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000004','authenticated','authenticated','contributor@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Neha Shah"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000005','authenticated','authenticated','approver@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Rohan Kapoor"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000006','authenticated','authenticated','viewer@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Meera Bose"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000007','authenticated','authenticated','auditor@acme.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Arjun Iyer"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000008','authenticated','authenticated','admin@northstar.emilda.test',crypt('EmildaDemo!2026',gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}','{"display_name":"Nina Thomas"}',now(),now())
on conflict (id) do update set email = excluded.email, encrypted_password = excluded.encrypted_password, updated_at = now();

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id::text, id, jsonb_build_object('sub',id::text,'email',email,'email_verified',true), 'email', now(), now(), now()
from auth.users where id::text like '20000000-0000-4000-8000-00000000000%'
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, display_name) values
 ('20000000-0000-4000-8000-000000000001','Priya Nair'),('20000000-0000-4000-8000-000000000002','Vishnu Rao'),
 ('20000000-0000-4000-8000-000000000003','Aishwarya Menon'),('20000000-0000-4000-8000-000000000004','Neha Shah'),
 ('20000000-0000-4000-8000-000000000005','Rohan Kapoor'),('20000000-0000-4000-8000-000000000006','Meera Bose'),
 ('20000000-0000-4000-8000-000000000007','Arjun Iyer'),('20000000-0000-4000-8000-000000000008','Nina Thomas')
on conflict (id) do update set display_name=excluded.display_name;

update public.profiles profile
set email = lower(auth_user.email),
  auth_provider = coalesce(auth_user.raw_app_meta_data ->> 'provider', 'email'),
  last_sign_in_at = auth_user.last_sign_in_at
from auth.users auth_user
where auth_user.id = profile.id;
insert into public.platform_admins(user_id) values('20000000-0000-4000-8000-000000000001') on conflict do nothing;

insert into public.tenants (id,name,slug) values
 ('10000000-0000-4000-8000-000000000001','Acme Operations','acme'),
 ('10000000-0000-4000-8000-000000000002','Northstar Services','northstar')
on conflict (id) do update set name=excluded.name, slug=excluded.slug;
insert into public.tenant_branding (tenant_id,primary_color,accent_color) values
 ('10000000-0000-4000-8000-000000000001','#1F6D62','#74D1BF'),('10000000-0000-4000-8000-000000000002','#5B4FA3','#9B8CE0')
on conflict (tenant_id) do update set primary_color=excluded.primary_color,accent_color=excluded.accent_color;
insert into public.tenant_auth_settings (tenant_id,google_enabled,microsoft_enabled,email_enabled) values
 ('10000000-0000-4000-8000-000000000001',true,false,true),('10000000-0000-4000-8000-000000000002',true,false,true)
on conflict (tenant_id) do update set google_enabled=excluded.google_enabled,microsoft_enabled=excluded.microsoft_enabled,email_enabled=excluded.email_enabled;

insert into public.tenant_profiles (
  tenant_id,legal_name,trading_name,website,industry,business_model,founded_year,company_size,
  headquarters,operating_locations,default_currency,owner_name,owner_title,owner_email,
  primary_contact_name,primary_contact_title,primary_contact_email,products_services,customer_types,
  systems_used,communication_channels,operational_challenges,business_goals,owner_dependencies,
  compliance_requirements,decision_making_style,seasonality,notes,updated_by
) values
 (
  '10000000-0000-4000-8000-000000000001','Acme Operations Private Limited','Acme Operations',
  'https://example.com','Distribution and field services','B2B service and distribution',2014,'51–100 people',
  'Bengaluru, Karnataka, India','Bengaluru head office and three regional dispatch hubs','INR',
  'Aishwarya Menon','Managing Director','aishwarya@acme.example','Priya Nair','Operations Administrator',
  'priya@acme.example','B2B fulfilment, field installation, maintenance, and recurring service contracts.',
  'Regional retailers, multi-site operators, and enterprise buyers.',
  'Google Workspace, Tally, WhatsApp, shared spreadsheets, and a dispatch portal.',
  'Email for formal decisions; WhatsApp for urgent field coordination.',
  'Approvals depend on the owner, evidence is scattered, and handoffs are not consistently visible.',
  'Reduce owner chasing, make service commitments visible, and grow without adding management overhead.',
  'Purchase approvals above routine limits and exception decisions still wait for the owner.',
  'GST records, supplier documentation, and customer service evidence.',
  'Fast and practical, with owner review for high-impact exceptions.',
  'Higher dispatch volume in the final week of each quarter.',
  'Process language should remain plain and usable by mobile-first field teams.',
  '20000000-0000-4000-8000-000000000001'
 ),
 (
  '10000000-0000-4000-8000-000000000002','Northstar Services Limited','Northstar Services',
  'https://northstar.example','Professional services','B2B managed services',2019,'11–50 people',
  'Pune, Maharashtra, India','Pune and remote service teams','INR','Nina Thomas','Founder',
  'nina@northstar.example','Nina Thomas','Founder','nina@northstar.example',
  'Managed customer service and implementation support.','Small and mid-sized business clients.',
  'Microsoft 365 and a service desk.','Microsoft Teams and email.',
  'Customer handoffs are inconsistent.','Make service ownership visible.','Complex escalations wait for the founder.',
  'Customer data handling requirements.','Collaborative, with founder review for exceptions.',
  'No material seasonality.','Second tenant for isolation testing.','20000000-0000-4000-8000-000000000008'
 )
on conflict (tenant_id) do update set
  operational_challenges=excluded.operational_challenges,business_goals=excluded.business_goals,
  owner_dependencies=excluded.owner_dependencies,updated_at=now();

insert into public.departments (id,tenant_id,name) values
 ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Operations'),
 ('11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Finance'),
 ('11000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Fulfilment'),
 ('11000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','Service')
on conflict (id) do update set name=excluded.name;

insert into public.tenant_memberships (id,tenant_id,user_id,department_id,status) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','ACTIVE'),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','ACTIVE'),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000002','ACTIVE'),
 ('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000003','ACTIVE'),
 ('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000002','ACTIVE'),
 ('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000006','11000000-0000-4000-8000-000000000001','ACTIVE'),
 ('30000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000001','ACTIVE'),
 ('30000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000004','ACTIVE')
on conflict (id) do update set status='ACTIVE';

insert into public.roles (id,tenant_id,role) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','TENANT_ADMIN'),
 ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','PROCESS_GUARDIAN'),
 ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','PROCESS_OWNER'),
 ('40000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','CONTRIBUTOR'),
 ('40000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','APPROVER'),
 ('40000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','VIEWER'),
 ('40000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','AUDITOR'),
 ('40000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000002','TENANT_ADMIN')
on conflict (tenant_id,role) do nothing;
insert into public.membership_roles (tenant_id,membership_id,role_id) values
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000005'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000005'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006','40000000-0000-4000-8000-000000000006'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000007','40000000-0000-4000-8000-000000000007'),
 ('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000008','40000000-0000-4000-8000-000000000008')
on conflict do nothing;

insert into public.processes (id,tenant_id,process_key,name,department_id,guardian_membership_id,current_active_version_id,current_health,audit_frequency,next_audit_at,access_scope,created_by) values
 ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','weekly-scorecard','Weekly Scorecard','11000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',null,'HEALTHY','WEEKLY','2026-09-15T09:00:00Z','EVERYONE','20000000-0000-4000-8000-000000000002'),
 ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','purchase-approval','Purchase Approval','11000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',null,'CRITICAL','WEEKLY','2026-09-12T09:00:00Z','RESTRICTED','20000000-0000-4000-8000-000000000002'),
 ('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','dispatch-confirmation','Dispatch Confirmation','11000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002',null,'NEEDS_ATTENTION','WEEKLY','2026-09-17T09:00:00Z','EVERYONE','20000000-0000-4000-8000-000000000002'),
 ('50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','service-handoff','Service Handoff','11000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000008',null,'HEALTHY','MONTHLY','2026-10-01T09:00:00Z','EVERYONE','20000000-0000-4000-8000-000000000008')
on conflict (id) do update set name=excluded.name,current_health=excluded.current_health;

insert into public.process_versions (id,tenant_id,process_id,major_version,minor_version,status,change_reason,purpose,business_problem,goal,trigger_description,current_state,future_state,owner_membership_id,design_stage,created_by,approved_at,effective_at) values
 ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',1,0,'DRAFT','Original process','Give leadership an accurate weekly view of commitments and business performance.','Leaders lacked a reliable weekly operating view.','100% required metrics updated before review.','Beginning of each reporting week.','Metrics were gathered inconsistently.','Owners verify metrics before a visible weekly review.','30000000-0000-4000-8000-000000000003',10,'20000000-0000-4000-8000-000000000002','2026-06-08T08:00:00Z','2026-06-09T00:00:00Z'),
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',2,0,'DRAFT','Digitized purchase request','Approve necessary purchases quickly while keeping spending controlled and visible.','Paper and chat requests were lost.','Make every request and decision visible.','A complete purchase request is submitted.','Requests are digital but one manager approves every amount.','Digital request with manager approval.','30000000-0000-4000-8000-000000000003',10,'20000000-0000-4000-8000-000000000002','2026-07-01T08:00:00Z','2026-07-02T00:00:00Z'),
 ('60000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',2,1,'DRAFT','Add delegated approval to reduce delay','Approve necessary purchases quickly while keeping spending controlled and visible.','Routine approvals exceed 48 hours.','95% of routine requests approved within 24 hours.','A complete purchase request is submitted.','All amounts depend on one manager.','Operations Lead approves complete requests below ₹25,000.','30000000-0000-4000-8000-000000000003',10,'20000000-0000-4000-8000-000000000002',null,'2026-09-20T00:00:00Z'),
 ('60000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000003',1,4,'DRAFT','Automate confirmation','Confirm every dispatch with reliable evidence before customer notification.','Dispatch evidence was missing.','100% dispatches have confirmation.','A dispatch is packed.','Manual confirmation.','Automated confirmation with evidence.','30000000-0000-4000-8000-000000000004',10,'20000000-0000-4000-8000-000000000002','2026-08-01T08:00:00Z','2026-08-02T00:00:00Z'),
 ('60000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000004',1,0,'DRAFT','Original process','Transfer each customer case with a clear owner.','Cases were lost during handoff.','No ownerless cases.','A case moves to service.','Informal handoff.','Recorded owner handoff.','30000000-0000-4000-8000-000000000008',10,'20000000-0000-4000-8000-000000000008','2026-08-01T08:00:00Z','2026-08-02T00:00:00Z')
on conflict (id) do nothing;
update public.processes set current_active_version_id='60000000-0000-4000-8000-000000000001' where id='50000000-0000-4000-8000-000000000001';
update public.processes set current_active_version_id='60000000-0000-4000-8000-000000000002' where id='50000000-0000-4000-8000-000000000002';
update public.processes set current_active_version_id='60000000-0000-4000-8000-000000000004' where id='50000000-0000-4000-8000-000000000003';
update public.processes set current_active_version_id='60000000-0000-4000-8000-000000000005' where id='50000000-0000-4000-8000-000000000004';

insert into public.process_nodes (id,tenant_id,process_id,version_id,node_key,node_type,title,action_text,timing,evidence,sort_order) values
 ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','start','START','Week begins','Begin reporting cycle',null,null,0),
 ('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','collect','ACTION','Collect current metric values','Collect current metric values.','Before Monday morning review','Completed scorecard',1),
 ('70000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','verify','ACTION','Verify each metric','Metric owners verify values.','Before publication deadline','Verified metric',2),
 ('70000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','review','ACTION','Review exceptions','Operations Lead reviews exceptions and commitments.','Weekly meeting','Meeting record',3),
 ('70000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','end','END','Scorecard published','Publish scorecard',null,'Published scorecard',4)
on conflict (id) do nothing;
insert into public.process_edges (id,tenant_id,process_id,version_id,source_node_id,target_node_id,sort_order) values
 ('71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002',0),
 ('71000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003',1),
 ('71000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000004',2),
 ('71000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000004','70000000-0000-4000-8000-000000000005',3)
on conflict (id) do nothing;
insert into public.process_metrics (id,tenant_id,process_id,version_id,name,target,cadence) values ('72000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Scorecard completeness','100% before review','Weekly') on conflict (id) do nothing;
insert into public.process_audit_checkpoints (id,tenant_id,process_id,version_id,node_id,question,is_critical,sort_order) values
 ('73000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Metric values updated before Monday review?',true,1),
 ('73000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000003','Metric owners verified their values?',false,2)
on conflict (id) do nothing;
update public.process_versions set status='ACTIVE' where id in ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000005') and status='DRAFT';
update public.process_versions set status='APPROVAL_PENDING' where id='60000000-0000-4000-8000-000000000003' and status='DRAFT';
insert into public.process_version_approvers (tenant_id,process_id,version_id,membership_id) values ('10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003') on conflict do nothing;
insert into public.process_access_rules (id,tenant_id,process_id,scope,department_id) values ('74000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','DEPARTMENT','11000000-0000-4000-8000-000000000002') on conflict (id) do nothing;

insert into public.approvals (id,tenant_id,process_id,version_id,approver_membership_id,requested_by,content_revision,status) values ('c0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002',1,'PENDING') on conflict (id) do nothing;
insert into public.process_releases (id,tenant_id,process_id,version_id,status,go_live_at,old_process_stops_at,snapshot,snapshot_hash,approved_at,activated_at,created_by) values
 ('d0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','ACTIVE','2026-06-09T00:00:00Z','2026-06-08T23:59:59Z','{"version":"1.0","name":"Weekly Scorecard"}',encode(digest('weekly-scorecard-1.0','sha256'),'hex'),'2026-06-08T08:00:00Z','2026-06-09T00:00:00Z','20000000-0000-4000-8000-000000000002'),
 ('d0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','SENT_FOR_APPROVAL','2026-09-20T00:00:00Z','2026-09-19T23:59:59Z',null,null,null,null,'20000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.audits (id,tenant_id,process_id,version_id,title,due_at,status,started_by,completed_at,calculated_health,calculated_score,data_coverage) values ('80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Weekly Scorecard Audit — Week 37','2026-09-08T09:00:00Z','DRAFT','20000000-0000-4000-8000-000000000002',null,null,null,null) on conflict (id) do nothing;
insert into public.audit_items (id,tenant_id,process_id,audit_id,checkpoint_id,node_id,question,is_critical,followed,evidence_available,sla_met,exception_occurred,comment,sort_order,saved_at) values
 ('81000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Metric values updated before Monday review?',true,'YES','YES','YES',false,'Complete scorecard attached.',1,'2026-09-08T09:35:00Z'),
 ('81000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003','Metric owners verified their values?',false,'PARTIALLY','YES','YES',false,'One late verification.',2,'2026-09-08T09:42:00Z') on conflict (id) do nothing;
update public.audits set status='COMPLETED',completed_at='2026-09-08T10:00:00Z',calculated_health='HEALTHY',calculated_score=92,data_coverage=1 where id='80000000-0000-4000-8000-000000000001' and status='DRAFT';
insert into public.health_snapshots (id,tenant_id,process_id,audit_id,calculated_health,displayed_health,score,data_coverage,factors) values ('82000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','HEALTHY','HEALTHY',92,1,'{"adherence":0.92,"evidence":1,"sla":1}') on conflict (id) do nothing;
insert into public.audits(id,tenant_id,process_id,version_id,title,status,due_at,started_by) values('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Weekly Scorecard Audit — Week 38','DRAFT','2026-09-15T09:00:00Z','20000000-0000-4000-8000-000000000002') on conflict(id) do nothing;
insert into public.audit_items(id,tenant_id,process_id,audit_id,checkpoint_id,node_id,question,is_critical,sort_order) values
 ('81000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','73000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Metric values updated before Monday review?',true,1),
 ('81000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','73000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003','Metric owners verified their values?',false,2),
 ('81000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002',null,'70000000-0000-4000-8000-000000000003','Missing metrics were marked visibly?',false,3),
 ('81000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002',null,'70000000-0000-4000-8000-000000000004','Operations Lead reviewed exceptions?',false,4),
 ('81000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002',null,'70000000-0000-4000-8000-000000000004','Commitments have an accountable owner?',false,5),
 ('81000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002',null,'70000000-0000-4000-8000-000000000005','Completed scorecard is available as evidence?',false,6)
on conflict(id) do nothing;

insert into public.issues (id,tenant_id,process_id,version_id,severity,title,description,root_cause,assigned_to,due_at,status,created_by) values ('90000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002','HIGH','Invoice approval delays','Approval SLA missed for three consecutive audits.','UNCLEAR_RESPONSIBILITY','30000000-0000-4000-8000-000000000003','2026-09-15T12:00:00Z','OPEN','20000000-0000-4000-8000-000000000002') on conflict (id) do nothing;
insert into public.change_requests (id,tenant_id,process_id,problem_observed,evidence_summary,proposed_change,expected_effect,requested_by,reviewer_membership_id,status,created_version_id) values ('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','Manager approval repeatedly exceeds the SLA.','Three audits and four related issues.','Delegate approvals below ₹25,000.','Approve routine purchases within 24 hours.','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','APPROVED','60000000-0000-4000-8000-000000000003') on conflict (id) do nothing;
insert into public.change_request_issues (tenant_id,process_id,change_request_id,issue_id) values ('10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into public.governance_notes (id,tenant_id,title,period_start,period_end,body,status,revision,created_by,published_at) values ('b0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Monthly Governance Note — September','2026-09-01','2026-09-30','Overall: 8 Healthy, 3 Need Attention, 1 Critical. Key issue: Purchase approval exceeds the 24-hour SLA. Root cause: Manager approval dependency. Action: Version 2.1 proposes delegated approval below ₹25,000. Owner action: Approve Purchase Approval v2.1.','PUBLISHED',1,'20000000-0000-4000-8000-000000000002','2026-09-12T08:00:00Z') on conflict (id) do nothing;

insert into public.search_documents (id,tenant_id,process_id,source_type,source_id,title,content,href) values
 ('e0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','PROCESS','50000000-0000-4000-8000-000000000002','Invoice Approval','Approve supplier invoices before payment. Purchase approval version 2.1.','/processes/purchase-approval'),
 ('e0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','STEP','70000000-0000-4000-8000-000000000002','Finance verifies invoice','Check PO, amount, supplier, and evidence before approval.','/processes/purchase-approval?tab=process'),
 ('e0000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','ISSUE','90000000-0000-4000-8000-000000000001','Invoice approvals delayed','Approval SLA missed in three consecutive audits.','/issues/invoice-delay'),
 ('e0000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','GOVERNANCE_NOTE','b0000000-0000-4000-8000-000000000001','Invoice approval SLA exceeded','Delegated approval below ₹25,000 is awaiting owner approval.','/governance-notes/september'),
 ('e0000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000004','PROCESS','50000000-0000-4000-8000-000000000004','Northstar Service Handoff','Tenant-isolated service process.','/processes/service-handoff')
on conflict (id) do update set content=excluded.content,href=excluded.href;
set session_replication_role = origin;
