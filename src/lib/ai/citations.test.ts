import { describe, expect, it } from "vitest";
import { citationsForRetrieved } from "./citations";
import type { SearchHit } from "@/lib/domain/types";
describe("AI citations", () => {
  it("drops citations outside the authorized retrieval set", () => {
    const hits: SearchHit[] = [
      {
        id: "allowed",
        type: "Process",
        title: "Purchase",
        excerpt: "x",
        href: "/processes/p",
      },
    ];
    expect(citationsForRetrieved(["allowed", "other"], hits)).toEqual([
      { searchDocumentId: "allowed", label: "Purchase", href: "/processes/p" },
    ]);
  });
});
