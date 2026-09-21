import { describe, expect, it } from "vitest";
import { calculateHealth } from "./health";
describe("calculateHealth", () => {
  it("renormalizes available factors", () => {
    expect(
      calculateHealth({
        adherence: [1, 1],
        outcome: ["MET"],
        evidence: [true],
        sla: [true],
        openIssueSeverities: [],
      }),
    ).toMatchObject({ status: "HEALTHY", score: 100, coverage: 1 });
  });
  it("returns gray under 50% coverage", () => {
    expect(calculateHealth({ evidence: [true], sla: [true] }).status).toBe(
      "NOT_ENOUGH_DATA",
    );
  });
  it("forces critical for unresolved critical issues", () => {
    expect(
      calculateHealth({
        adherence: [1],
        outcome: ["MET"],
        evidence: [true],
        sla: [true],
        openIssueSeverities: ["CRITICAL"],
      }).status,
    ).toBe("CRITICAL");
  });
  it("scores partial adherence as one half", () => {
    expect(
      calculateHealth({
        adherence: [0.5],
        outcome: ["AT_RISK"],
        evidence: [true],
        sla: [true],
        openIssueSeverities: ["MEDIUM"],
      }).status,
    ).toBe("NEEDS_ATTENTION");
  });
});
