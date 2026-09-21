import { describe, expect, it } from "vitest";
import {
  canTransitionVersion,
  diffRecords,
  isContentLocked,
  matchesLockVersion,
  nextVersion,
} from "./versioning";
describe("version rules", () => {
  it("locks approval pending and approved content", () => {
    expect(isContentLocked("APPROVAL_PENDING")).toBe(true);
    expect(isContentLocked("ACTIVE")).toBe(true);
    expect(isContentLocked("DRAFT")).toBe(false);
  });
  it("requires the normal lifecycle", () => {
    expect(canTransitionVersion("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransitionVersion("DRAFT", "ACTIVE")).toBe(false);
  });
  it("increments minor or major", () => {
    expect(nextVersion("2.0")).toBe("2.1");
    expect(nextVersion("2.4", "REDESIGN")).toBe("3.0");
  });
  it("detects optimistic conflicts", () =>
    expect(matchesLockVersion(2, 3)).toBe(false));
  it("reports added, removed, and changed values", () =>
    expect(
      diffRecords({ a: "1", b: "2" }, { b: "3", c: "4" }).map(
        (item) => item.kind,
      ),
    ).toEqual(["REMOVED", "CHANGED", "ADDED"]));
});
