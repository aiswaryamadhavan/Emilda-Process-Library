import { describe, expect, it } from "vitest";
import { exportMermaid, parseMermaid, validateGraph } from "./mermaid";
describe("Mermaid adapter", () => {
  it("imports supported branches and loops", () => {
    const result = parseMermaid(
      "flowchart TD\n start(Start) --> choice{Ready?}\n choice -->|Yes| end(End)\n choice -->|No| start\n",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.graph.edges).toHaveLength(3);
      expect(validateGraph(result.graph)).toEqual([]);
    }
  });
  it("returns a precise friendly diagnostic", () => {
    const result = parseMermaid(
      "flowchart TD\n subgraph Hidden\n A --> B\n end",
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]).toMatchObject({ line: 2, column: 1 });
  });
  it("rejects active content", () =>
    expect(parseMermaid("flowchart TD\n click A https://evil.test").ok).toBe(
      false,
    ));
  it("exports deterministic metadata and preserves supported node types on round trip", () => {
    const result = parseMermaid(
      "flowchart LR\n %% emilda:type=HANDOFF\n handoff[Send to manager]\n %% emilda:type=WAIT\n wait[Wait 24 hours]\n handoff --> wait",
    );
    if (!result.ok) throw new Error("fixture invalid");
    const exported = exportMermaid(result.graph);
    expect(exported).toContain("%% emilda:type=HANDOFF");
    const roundTrip = parseMermaid(exported);
    expect(roundTrip.ok).toBe(true);
    if (roundTrip.ok)
      expect(roundTrip.graph.nodes.map((node) => node.type)).toEqual([
        "HANDOFF",
        "WAIT",
      ]);
  });
  it("recognizes the supported Mermaid data shape without metadata", () => {
    const result = parseMermaid(
      "flowchart LR\n source[(Purchase request)] --> finish(End)",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.graph.nodes[0]).toMatchObject({
        type: "DATA",
        title: "Purchase request",
      });
    }
  });
});
