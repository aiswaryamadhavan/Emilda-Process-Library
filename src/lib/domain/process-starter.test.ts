import { describe, expect, it } from "vitest";
import { validateGraph } from "@/lib/domain/mermaid";
import {
  createStarterDraft,
  processStarterDraftSchema,
  type ProcessStarterInput,
} from "@/lib/domain/process-starter";

const input: ProcessStarterInput = {
  name: "Customer enquiry handoff",
  department: "Sales",
  goal: "Assign every qualified enquiry within four business hours.",
  problem: "Ownership is unclear and the owner is chased.",
  currentMethod: "Sales forwards messages in WhatsApp.",
  trigger: "A qualified enquiry arrives",
  ownerRole: "Sales Operations Lead",
  contributors: "Sales Coordinator, Service Lead",
  inputs: "Customer details, request summary",
  output: "A named service owner and first-response deadline",
  evidence: "CRM assignment record",
  exceptions: "No service owner is available",
  cadence: "Within four business hours",
  constraints: "Use the existing service desk.",
  auditQuestions:
    "Was the enquiry assigned within four hours? Was the first response sent?",
  resourceLinks: [],
};

describe("process starter", () => {
  it("creates a valid, editable graph with an exception loop", () => {
    const draft = createStarterDraft(input);
    expect(processStarterDraftSchema.safeParse(draft).success).toBe(true);
    expect(validateGraph(draft.graph)).toEqual([]);
    expect(draft.graph.nodes.some((node) => node.type === "DECISION")).toBe(
      true,
    );
    expect(
      draft.graph.edges.some((edge) => edge.target === "complete_work"),
    ).toBe(true);
  });

  it("marks missing facts as assumptions and open questions", () => {
    const draft = createStarterDraft({
      ...input,
      trigger: "",
      ownerRole: "",
      evidence: "",
      exceptions: "",
      cadence: "",
      constraints: "",
    });
    expect(draft.assumptions.length).toBeGreaterThanOrEqual(4);
    expect(draft.unansweredQuestions).toContain(
      "Who is the one accountable Process Owner?",
    );
  });
});
