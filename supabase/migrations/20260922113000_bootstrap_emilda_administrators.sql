-- Global administrators are activated automatically after verified Google sign-in.
-- Paul is the Super Admin; Aiswarya is the global operational Admin.
insert into private.platform_admin_allowlist (email)
values
  ('paul@emildasolutions.com'),
  ('aiswarya@emildasolutions.com')
on conflict (email) do nothing;
