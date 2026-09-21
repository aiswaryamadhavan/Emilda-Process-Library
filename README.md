# Emilda Governance OS V1

Emilda Governance OS is a mobile-first, multi-tenant process governance system for owner-led businesses. It joins process design, approval, immutable versioning, release, implementation, audit, issue diagnosis, improvement, and owner visibility in one product.

The product is intentionally management-by-exception: healthy work recedes, while approvals, overdue audits, unresolved issues, and unhealthy processes get the user's attention.

## What is implemented

- Progressive tenant provisioning with a detailed, amendable client profile, departments, branding, auth-provider settings, invitations, roles, process access, clean production paths such as `gov.emilda.co/kmct`, and local `/t/[slug]` routing.
- Google-only production authentication, invitation-by-email user access, visible user IDs, multi-role assignment, and automatic Super Admin bootstrap for `asiwarya@emildasolutions.com` and `paul@emildasolutions.com` after verified Google sign-in.
- Role-aware Owner, Guardian, and Process Owner homes with simple next actions.
- Searchable process library grouped by the client's departments, process workspace, ten-stage engagement wizard, comments/attachments data model, and Focus View patterns.
- AI-assisted process creation that asks practical discovery questions, uses the RLS-authorized client profile as context, labels assumptions, and produces an editable structured draft. A safe local starter remains available when OpenAI is not configured.
- Structured process graphs with desktop React Flow editing, mobile step editing, validation, deterministic Mermaid import/export, and safe previewing.
- Immutable approved versions, change-reason cloning, version comparison, assigned approvals, release snapshots, implementation/adoption readiness, scheduling, and activation.
- Branded multi-page Process Release PDF with a vector process map and signed-document attachment support.
- Resumable checkpoint audits, evidence upload, health calculation/history, cadence scheduling, issue/root-cause handling, Change Requests, and the new-version improvement loop.
- Governance Notes, activity records, notifications, permission-aware full-text search, and optional citation-constrained Ask Emilda responses.
- PWA manifest and static-only service worker. Authenticated HTML and tenant data are not cached.

## Architecture

- Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, and accessible Radix/shadcn primitives.
- Supabase PostgreSQL/Auth/Storage. Browser and Server Action calls use the signed-in user's session so forced RLS remains active.
- One Vercel deployment serves the shared governance portal. `proxy.ts` resolves and validates a tenant from `gov.emilda.co/[slug]`; local development uses `/t/acme` and `/t/northstar`. Legacy tenant subdomains remain supported.
- Every business table has `tenant_id`. Composite tenant foreign keys prevent cross-tenant parent/child references. Private helper functions centralize membership and process-access checks.
- React Flow is the structured diagram editor; Mermaid is an import/export representation, never the source of truth.
- Release PDFs are generated with `@react-pdf/renderer`, not screenshots.

See [architecture and data-model diagrams](docs/architecture.md), the rendered [architecture SVG](docs/architecture.svg), [role matrix](docs/role-matrix.md), and [tenant isolation notes](docs/tenant-isolation.md).

## Local installation

Prerequisites: Node.js 22, npm, Supabase CLI, and either Docker Desktop or an unprivileged Docker-compatible runtime such as Colima.

```bash
npm ci
supabase start
supabase db reset
supabase status -o env
cp .env.example .env.local
```

Copy the local `API_URL`, publishable/anon key, and service-role key reported by `supabase status -o env` into `.env.local`. Then start the application:

```bash
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/t/acme`. When Supabase variables are present, protected routes require login. When they are absent, the UI runs in a deterministic product-demo mode used by the visual regression suite.

Supabase Studio is available at `http://127.0.0.1:54323` and local captured email at `http://127.0.0.1:54324`.

## Demo accounts

All local accounts use the password `EmildaDemo!2026`.

| Account                        | Primary role     | Purpose                                           |
| ------------------------------ | ---------------- | ------------------------------------------------- |
| `admin@acme.emilda.test`       | Tenant Admin     | Users, branding, access, and tenant configuration |
| `guardian@acme.emilda.test`    | Process Guardian | Design, audits, issues, releases, and governance  |
| `owner@acme.emilda.test`       | Process Owner    | Assigned process outcomes and issue responses     |
| `contributor@acme.emilda.test` | Contributor      | Assigned steps, notes, and evidence               |
| `approver@acme.emilda.test`    | Approver         | Assigned release review and approval              |
| `viewer@acme.emilda.test`      | Viewer           | Read-only permitted processes                     |
| `auditor@acme.emilda.test`     | Auditor          | Read and configured audits                        |
| `admin@northstar.emilda.test`  | Tenant Admin     | Second-tenant isolation fixture                   |

The Acme tenant contains Weekly Scorecard, Purchase Approval, and Dispatch Confirmation with distinct health states, an approval, audits, issues, a Change Request, and a Governance Note. Northstar contains separate branding, users, and process data.

## Commands and quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:lint
npm run db:test
npm run test:e2e
npm run build
```

To exercise real cookie authentication, RLS, writes, audit resume, and evidence storage against the disposable local stack:

```bash
npm run db:reset
npm run test:e2e:live
```

Other useful commands are `npm run pdf:demo`, `npm run db:start`, and `npm run qa`. Playwright installs its browser with `npx playwright install chromium`.

The database tests include adversarial cross-tenant reads/writes, process access, foreign-key mismatches, immutable histories, stale approvals, and privileged workflow checks. Playwright covers 360/390/430 px mobile viewports, desktop, axe checks, no-horizontal-overflow assertions, approvals, auditing, uploads, tenant routing, search, Mermaid errors, Focus View, and the key governance loop. Current verified results are recorded in [test results](docs/test-results.md).

## Production deployment

Use a dedicated hosted Supabase project and one Vercel project. Apply migrations with `supabase db push`, configure the environment variables in `.env.example`, and add `gov.emilda.co` to Vercel. Point only the `gov` CNAME at the project-specific Vercel DNS target; the main `emilda.co` website can stay on its existing host. Configure Google in Supabase Auth and allow the exact `https://gov.emilda.co/auth/callback` application callback. Microsoft and tenant email/password access are disabled at both the interface and database layers.

The service-role key is server-only. Set a long random `CRON_SECRET`; Vercel invokes `/api/cron/hourly` once daily on the Hobby plan for safe scheduled activation, overdue-audit reminders, and digest materialization. Pro accounts may restore an hourly schedule. Review database/storage advisors and manually smoke-test the Google consent flow after production configuration.

The full sequence, security checks, DNS, provider, storage, and rollback guidance is in the [deployment runbook](docs/deployment.md).

## Security model

- Tenant context is derived from a validated hostname/path and verified against the authenticated membership; browser-supplied tenant IDs are never authoritative.
- Exposed tenant tables have enabled and forced RLS. Policies use both `USING` and `WITH CHECK`; functions use hardened search paths and least-privilege grants.
- Approved process versions and their graph content, approval events, completed audits, health snapshots, published notes, release snapshots, and activity history are protected by database triggers.
- Cross-tenant and inaccessible process URLs return 404. Same-tenant forbidden actions return a plain-language permission explanation.
- Evidence uses a private bucket, tenant-prefixed random paths, MIME/signature/size checks, metadata links, and server-authorized 60-second signed URLs.
- Ask Emilda retrieves through RLS first, sends only authorized snippets with `store: false`, and rejects citations outside the retrieved set. It has no mutation tools.

## Generated artifacts

- Demo release: `output/pdf/Acme-Purchase-Approval-v2.1.pdf`
- Architecture source/render: `docs/architecture.md`, `docs/architecture.canonical.json`, `docs/architecture.svg`
- Required screenshots: `docs/screenshots/`
- Future integration contract: `docs/future-events-api.md`

## V1 limits and Phase 2

V1 intentionally keeps external signed-document handling manual, does not support offline editing, and performs allowlist/signature validation rather than full malware scanning. Ask Emilda requires separately supplied OpenAI credentials. Production Google OAuth, wildcard DNS, and external-provider consent require deployment credentials and a final environment-specific smoke test.

See [known limitations and Phase 2 roadmap](docs/known-limitations.md) for SCIM/group sync, e-signature, custom domains, richer AI, inbound process events/webhooks, automated evidence, messaging integrations, analytics, templates, and billing.
