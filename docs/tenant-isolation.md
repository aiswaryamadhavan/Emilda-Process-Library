# Tenant isolation design

Emilda is one deployment and one database, with tenant isolation enforced below the UI.

1. `proxy.ts` accepts a tenant from the production `gov.emilda.co/[slug]` path, a legacy tenant subdomain, or a local `/t/[slug]` prefix and rewrites it into a server-only tenant context.
2. The server verifies that the signed-in user has an active membership for the resolved tenant. A request body, query string, route parameter, or client cookie cannot choose another tenant.
3. Every tenant-owned row has `tenant_id`. Parent and child tables use unique/composite keys such as `(tenant_id, id)` and composite foreign keys, so a child cannot point at another tenant's parent even through direct SQL/API manipulation.
4. Every exposed tenant table enables and forces RLS. Authenticated policies require tenant membership and, where relevant, process-level visibility. Write policies repeat the predicate in `WITH CHECK`.
5. Process visibility is the union of explicit Everyone, Department, Role, and User access rules plus accountable relationships. Search is a tenant-scoped projection and uses the same process-access predicate, so inaccessible results do not reveal titles or even existence.
6. The normal application uses a cookie-scoped Supabase client; it does not bypass RLS. The service-role key is confined to provisioning, scheduled work, and other narrow server-only operations.
7. Private evidence objects are stored under a tenant UUID prefix. Upload and download handlers recheck membership, target process access, file metadata, and object path. Downloads receive a signed URL with a 60-second lifetime.
8. Cross-tenant or inaccessible URLs return 404. This prevents ID enumeration from distinguishing “not found” from “belongs to another tenant.”

The pgTAP suite impersonates Acme and Northstar users and attempts cross-tenant reads, inserts, updates, deletes, search, workflow RPCs, mismatched composite foreign keys, and historical-record mutations. Live Playwright tests additionally sign in as the Process Owner, Process Guardian, and Viewer and exercise cross-tenant URLs and restricted-process discovery.
