import type { ProcessGraph, SearchHit } from "@/lib/domain/types";

export const processes: {
  id: string;
  name: string;
  department: string;
  owner: string;
  version: string;
  health: "HEALTHY" | "NEEDS_ATTENTION" | "CRITICAL" | "NOT_ENOUGH_DATA";
  lastAudit: string;
  nextAudit: string;
  status: string;
  purpose: string;
}[] = [];

export const weeklyScorecardGraph: ProcessGraph = {
  direction: "LR",
  nodes: [],
  edges: [],
};

export const purchaseApprovalGraph: ProcessGraph = {
  direction: "LR",
  nodes: [],
  edges: [],
};

export const searchHits: SearchHit[] = [];
