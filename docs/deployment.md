# Vercel and Supabase deployment runbook

## 1. Prepare production infrastructure

- Create a hosted Supabase project using PostgreSQL 17 and record the project reference.
- Create one Vercel project from this repository and set Node.js 22.
- Generate a strong `CRON_SECRET`. Treat the Supabase service-role key and OpenAI key as server-only secrets.
- Use `gov.emilda.co` as `TENANT_PATH_HOST`. `ROOT_DOMAIN` remains available for optional legacy tenant subdomains.

## 2. Apply the database

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db lint --linked --level warning --fail-on error
```

Do not apply `supabase/seed.sql` to production: it contains local-only demo accounts. The production migration allowlists `asiwarya@emildasolutions.com` and `paul@emildasolutions.com`. Each becomes an Emilda Super Admin automatically only after completing a verified Google sign-in; no password account or manual database insert is required.

After each migration, review Supabase Database, Security, and Performance Advisors. Confirm `FORCE ROW LEVEL SECURITY`, explicit Data API grants, private evidence storage, and the composite tenant foreign keys before admitting tenants.

## 3. Configure authentication

- In Supabase Auth URL Configuration, set the site URL to the production application and allow its `/auth/callback` URL.
- Configure the Google provider with Supabase's callback URL. Microsoft and tenant email/password login are deliberately disabled.
- Add the production hostname to the Google OAuth client's authorized JavaScript origins and use the Supabase callback URL as its authorized redirect URI.
- Client access is assigned by exact Google email. After a Tenant Admin creates access, the user opens the copied portal sign-in link and signs in with that matching Google identity.

Run a manual consent-and-return smoke test for both Super Admin accounts and one invited client user after every callback/domain change.

## 4. Configure Vercel

Set these environment variables for Preview and Production as appropriate:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
ROOT_DOMAIN
TENANT_PATH_HOST
CRON_SECRET
OPENAI_API_KEY          # optional
OPENAI_MODEL            # optional
```

Add only `gov.emilda.co` to the Vercel project and use the unique CNAME value shown by Vercel. At the authoritative DNS provider for `emilda.co`, create a `gov` CNAME pointing to that value. Do not move the apex domain, website, email records, or nameservers. Tenants use paths such as `gov.emilda.co/kmct`; no per-client DNS record is required. Test an unrecognized path slug and ensure it receives the tenant-not-found response.

`vercel.json` schedules the protected maintenance job once daily so it remains compatible with Vercel Hobby. A Pro deployment may change the expression back to hourly. Confirm Vercel sends the cron authorization header and that the endpoint rejects a missing or wrong bearer secret.

## 5. Storage and file security

- Confirm `branding` is public and image-only.
- Confirm `evidence` is private and has no broad object SELECT policy.
- Upload test JPEG, PNG, PDF, DOCX, XLSX, CSV, and TXT files; reject HTML, SVG, executables, spoofed signatures, and files over 25 MB.
- As a second-tenant user, attempt to open the first tenant's attachment route and verify 404/denial.

## 6. Release verification

Run against a disposable/staging project before production:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:lint
npm run db:test
npm run test:e2e
npm run build
npm audit --omit=dev
```

Manually complete the six PRD personas: Client Owner, Process Guardian, Process Owner, Tenant Admin, unauthorized employee, and a second-tenant user. Verify 360 px approval/audit, 200% zoom, keyboard focus, reduced motion, PDF rendering, signed-document upload, stale approval rejection, approved-version immutability, audit refresh/resume, and search non-disclosure.

## 7. Rollback and incident response

- Application rollback: redeploy the last known-good immutable Vercel deployment.
- Database rollback: migrations are forward-only. Restore from a point-in-time backup only for an incident; otherwise ship a reviewed corrective migration that preserves governance history.
- Credential incident: rotate the affected Vercel/Supabase secret, revoke sessions if required, review `activity_logs`, storage access logs, Auth logs, and Vercel request logs, then record the incident and tenant impact.
- Never delete approved versions, completed approval events, releases, historical audits, health snapshots, or activity events during cleanup.
