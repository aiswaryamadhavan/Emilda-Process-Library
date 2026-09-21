# Known V1 limitations and Phase 2 roadmap

## V1 limits

- Google OAuth requires production provider credentials, allowed callback URLs, and a manual consent-flow smoke test. Local development keeps seeded email/password accounts only for automated testing.
- A formal signature is collected externally and uploaded to the exact release. V1 does not claim that in-app acknowledgement is a jurisdiction-specific legally binding signature.
- Ask Emilda is optional. Without `OPENAI_API_KEY` and `OPENAI_MODEL`, permission-aware search remains available and the AI screen explains that configuration is missing.
- Offline editing is intentionally unsupported. The PWA caches only static application assets; authenticated HTML and tenant data require a network connection.
- Uploads use an extension/MIME allowlist, magic-byte/signature checks, a 25 MB limit, quarantine naming, and private storage. Full malware scanning is not included.
- Complex graph rearrangement is optimized for desktop. Mobile users can read the graph, edit step properties, comment, attach evidence, approve, and audit.
- Scheduled jobs run daily on Vercel Hobby and may run hourly on Pro. V1 does not promise second-level activation or notification delivery.
- Custom-domain data structures exist, but production custom tenant domain onboarding and certificate automation are deferred.

## Recommended Phase 2

1. SCIM plus Entra and Google Workspace group synchronization.
2. Custom tenant-domain verification, routing, and certificate lifecycle.
3. Integrated e-signature provider with completion webhooks and evidence validation.
4. Email and WhatsApp governance digests with tenant-controlled escalation policies.
5. Richer permission-aware AI for trend synthesis, draft assistance, and governed tool use.
6. Authenticated, idempotent process-event ingestion using the documented `POST /api/v1/events` contract and tenant-bound API credentials.
7. Automated evidence connectors for client ERP, CRM, accounting, and line-of-business applications.
8. Process templates, cross-process dependency views, and opt-in privacy-safe benchmarking.
9. Deeper trend analytics only where data quality supports defensible metrics.
10. Governance subscription billing and entitlement controls.
