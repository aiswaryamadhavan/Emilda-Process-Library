import { describe, expect, it } from "vitest";
import { can, canApproveAssignedRelease } from "./permissions";
describe("permissions", () => {
  it("keeps viewers read-only", () => {
    expect(can(["VIEWER"], "VIEW")).toBe(true);
    expect(can(["VIEWER"], "DESIGN")).toBe(false);
  });
  it("requires approval assignment", () => {
    expect(canApproveAssignedRelease(["APPROVER"], false)).toBe(false);
    expect(canApproveAssignedRelease(["APPROVER"], true)).toBe(true);
  });
  it("does not let a Guardian approve by role alone", () =>
    expect(can(["PROCESS_GUARDIAN"], "APPROVE_RELEASE")).toBe(false));
});
