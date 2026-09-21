# V1 verification record

Verified on 14 September 2026 with Node.js 22, Next.js 16.3.5, PostgreSQL 17, Supabase CLI, Chromium, and an unprivileged Colima Docker runtime.

| Gate                              | Result                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| Prettier format check             | Pass                                                             |
| ESLint                            | Pass; no errors                                                  |
| TypeScript `tsc --noEmit`         | Pass; no errors                                                  |
| Vitest                            | 8 files, 25 tests passed                                         |
| Migration replay from empty       | Pass; all four migrations plus seed applied                      |
| Supabase schema lint              | Pass; no schema errors                                           |
| pgTAP database suite              | 3 files, 31 tests passed                                         |
| Playwright product/viewport suite | 66 passed, 22 intentional skips                                  |
| Live Supabase desktop flows       | 4 passed, including database-backed AI-assisted process creation |
| axe WCAG 2.1 A/AA scan            | Pass; zero serious or critical findings on major desktop routes  |
| Production build                  | Pass; 23 pages generated and all dynamic routes compiled         |
| npm dependency audit              | Pass; 0 known vulnerabilities                                    |
| Process Release PDF               | Pass; 7 A4 pages, no JavaScript, visually rendered and inspected |
| Delivery screenshots              | Pass; five required and three new workflow views captured        |

The 22 default Playwright skips are deliberate: 16 live-Supabase cases are gated behind `LIVE_SUPABASE_E2E`, three axe duplicates are skipped on mobile because the desktop suite scans the same semantic pages, and three duplicate screenshot runs are skipped outside the desktop project. The live suite was run separately against a clean database. Additional checks verify Google-only sign-in, exact-email invitation acceptance, automatic Super Admin allowlisting, role assignment, user IDs, and tenant-path navigation on the deployed site.

## Adversarial checks exercised

- Acme user reading, modifying, searching, or linking a Northstar record.
- Cross-tenant composite foreign-key manipulation.
- Viewer discovery of a restricted process URL.
- Direct private evidence listing and tenant-scoped upload/download behavior.
- Editing approved process content or adding child graph records to an approved version.
- Mutating completed audit items and historical health data.
- Reusing a completed/stale approval.
- Creating a version from another tenant.
- Invalid and unsupported Mermaid with line/column feedback.
- Refreshing a partial audit and continuing at the saved checkpoint.
- 360, 390, and 430 px layouts with no document-level horizontal overflow.
- Tenant A being unable to read Tenant B's detailed client profile.
- Database-backed Guardian creation of an AI-assisted draft inside a tenant department.
- Client-profile amendment and department-grouped process discovery.

External Google OAuth consent, wildcard DNS/TLS, and hosted Supabase advisors require deployment credentials and remain explicit production smoke-test items in the deployment runbook.
