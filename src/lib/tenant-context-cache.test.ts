import { describe, expect, it } from "vitest";

import {
  createTenantContextCookie,
  readTenantContextCookie,
} from "./tenant-context-cache";

const secret = "a-production-length-test-secret-value";
const now = Date.parse("2026-09-14T12:00:00.000Z");
const context = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  tenantName: "Acme Operations",
  tenantSlug: "acme",
  primaryColor: "#145e66",
  accentColor: "#8bd3c7",
  viewerName: "Paul",
  viewerRole: "Tenant Admin",
  supportReason: null,
  supportExpiresAt: null,
};

describe("signed tenant shell context", () => {
  it("reuses an untampered context only for the same user and tenant", () => {
    const cookie = createTenantContextCookie(
      context,
      "user-a",
      secret,
      now,
      now / 1000 + 3600,
    );
    expect(cookie).not.toBeNull();
    expect(
      readTenantContextCookie(
        cookie?.value,
        "user-a",
        "acme",
        secret,
        now + 1000,
      ),
    ).toEqual(context);
    expect(
      readTenantContextCookie(
        cookie?.value,
        "user-b",
        "acme",
        secret,
        now + 1000,
      ),
    ).toBeNull();
    expect(
      readTenantContextCookie(
        cookie?.value,
        "user-a",
        "northstar",
        secret,
        now + 1000,
      ),
    ).toBeNull();
  });

  it("rejects tampering and expiry", () => {
    const cookie = createTenantContextCookie(context, "user-a", secret, now);
    expect(
      readTenantContextCookie(
        `${cookie?.value}changed`,
        "user-a",
        "acme",
        secret,
        now,
      ),
    ).toBeNull();
    expect(
      readTenantContextCookie(
        cookie?.value,
        "user-a",
        "acme",
        secret,
        now + 5 * 60 * 1000,
      ),
    ).toBeNull();
  });

  it("never outlives temporary support access", () => {
    const supportContext = {
      ...context,
      supportExpiresAt: "2026-09-14T12:01:00.000Z",
    };
    const cookie = createTenantContextCookie(
      supportContext,
      "user-a",
      secret,
      now,
    );
    expect(cookie?.expiresAt).toBe(now + 60_000);
    expect(
      readTenantContextCookie(
        cookie?.value,
        "user-a",
        "acme",
        secret,
        now + 60_000,
      ),
    ).toBeNull();
  });
});
