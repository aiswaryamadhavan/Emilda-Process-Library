import { describe, expect, it } from "vitest";
import { nextAuditDate } from "./cadence";
describe("nextAuditDate", () => {
  it("keeps the original weekly anchor", () =>
    expect(
      nextAuditDate(
        new Date("2026-09-01T09:00:00Z"),
        new Date("2026-09-10T12:00:00Z"),
        "WEEKLY",
      ).toISOString(),
    ).toBe("2026-09-15T09:00:00.000Z"));
  it("preserves end-of-month semantics", () =>
    expect(
      nextAuditDate(
        new Date("2026-01-31T09:00:00Z"),
        new Date("2026-02-28T10:00:00Z"),
        "MONTHLY",
      ) > new Date("2026-02-28T10:00:00Z"),
    ).toBe(true));
});
