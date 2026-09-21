import { describe, expect, it } from "vitest";
import {
  decodeTenantShellContext,
  encodeTenantShellContext,
  parseTenantShellContext,
  resolveTenantRoute,
  resolveTenantSlug,
  stripLocalTenantPrefix,
  stripTenantPathPrefix,
  tenantPortalPath,
} from "./tenant";

describe("tenant resolution", () => {
  it("resolves wildcard hosts", () =>
    expect(resolveTenantSlug("acme.emildaos.com", "/")).toBe("acme"));
  it("resolves and strips local tenant paths", () => {
    expect(resolveTenantSlug("localhost:3000", "/t/northstar/processes")).toBe(
      "northstar",
    );
    expect(stripLocalTenantPrefix("/t/northstar/processes")).toBe("/processes");
  });
  it("rejects reserved or malformed slugs", () => {
    expect(resolveTenantSlug("admin.emildaos.com", "/")).toBeNull();
    expect(resolveTenantSlug("localhost", "/t/Bad!/processes")).toBeNull();
  });
  it("resolves clean client paths on the governance portal", () => {
    expect(
      resolveTenantRoute(
        "gov.emilda.co",
        "/kmct/processes",
        "emildaos.com",
        "gov.emilda.co",
      ),
    ).toEqual({
      slug: "kmct",
      pathPrefix: "/kmct",
      canonicalPath: "/processes",
      source: "portal-path",
    });
    expect(
      resolveTenantSlug(
        "gov.emilda.co",
        "/admin/tenants",
        "emildaos.com",
        "gov.emilda.co",
      ),
    ).toBeNull();
    expect(stripTenantPathPrefix("/kmct/governance", "/kmct")).toBe(
      "/governance",
    );
  });
  it("builds the right portal path for each supported host style", () => {
    expect(tenantPortalPath("kmct", "gov.emilda.co")).toBe("/kmct/");
    expect(tenantPortalPath("kmct", "localhost:3000")).toBe("/t/kmct/");
    expect(tenantPortalPath("kmct", "kmct.emildaos.com")).toBe("/");
  });
});

describe("tenant shell context", () => {
  const context = {
    tenantId: "10000000-0000-4000-8000-000000000001",
    tenantName: "Acme Operations",
    tenantSlug: "acme",
    primaryColor: "#145e66",
    accentColor: "#8bd3c7",
    viewerName: "Aishwarya",
    viewerRole: "Emilda Setup Access",
    supportReason: "Client setup and configuration",
    supportExpiresAt: "2026-09-14T18:00:00.000Z",
  };

  it("round-trips the trusted server context", () => {
    expect(decodeTenantShellContext(encodeTenantShellContext(context))).toEqual(
      context,
    );
  });

  it("rejects invalid tenant colors and malformed values", () => {
    expect(
      parseTenantShellContext({ ...context, primaryColor: "red" }),
    ).toBeNull();
    expect(decodeTenantShellContext("not-valid-json")).toBeNull();
  });
});
