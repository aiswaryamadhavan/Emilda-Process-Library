# Future process-event API contract

This contract documents the intended Phase 2 ingestion surface. V1 deliberately does not expose the endpoint.

`POST /api/v1/events`

Authentication will resolve the tenant from a tenant-bound API credential. A request body will never be allowed to choose or override `tenant_id`. Every request must include an `Idempotency-Key` header, retained per tenant so retries return the original result.

```json
{
  "processId": "uuid",
  "stepId": "uuid",
  "eventType": "DISPATCH_COMPLETED",
  "occurredAt": "2026-09-12T09:30:00Z",
  "actor": { "externalId": "erp-user-42", "displayName": "Neha Rao" },
  "evidenceUrl": "https://client.example/evidence/123",
  "metadata": { "dispatchNumber": "DSP-1039" }
}
```

The eventual handler must validate the event type and timestamp, verify that the process and step belong to the authenticated tenant, reject private-network evidence URLs, preserve the original payload hash, rate-limit by credential, and write an immutable ingestion event before any governance projection is updated.
