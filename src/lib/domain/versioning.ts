import type { ProcessVersionStatus } from "./types";

const transitions: Record<ProcessVersionStatus, ProcessVersionStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "APPROVAL_PENDING", "CHANGES_REQUESTED"],
  CHANGES_REQUESTED: ["DRAFT", "IN_REVIEW"],
  APPROVAL_PENDING: ["CHANGES_REQUESTED", "APPROVED"],
  APPROVED: ["SCHEDULED"],
  SCHEDULED: ["ACTIVE"],
  ACTIVE: ["SUPERSEDED", "RETIRED"],
  SUPERSEDED: [],
  RETIRED: [],
};

export function canTransitionVersion(
  from: ProcessVersionStatus,
  to: ProcessVersionStatus,
): boolean {
  return transitions[from].includes(to);
}

export function isContentLocked(status: ProcessVersionStatus): boolean {
  return [
    "APPROVAL_PENDING",
    "APPROVED",
    "SCHEDULED",
    "ACTIVE",
    "SUPERSEDED",
    "RETIRED",
  ].includes(status);
}

export function nextVersion(
  current: string,
  kind: "IMPROVEMENT" | "REDESIGN" = "IMPROVEMENT",
): string {
  const match = /^(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error("Version must use major.minor format");
  const [, major, minor] = match.map(Number);
  return kind === "REDESIGN" ? `${major + 1}.0` : `${major}.${minor + 1}`;
}

export function matchesLockVersion(expected: number, actual: number): boolean {
  return Number.isInteger(expected) && expected > 0 && expected === actual;
}

export interface DiffItem {
  kind: "ADDED" | "REMOVED" | "CHANGED";
  field: string;
  before?: string;
  after?: string;
}
export function diffRecords(
  before: Record<string, string>,
  after: Record<string, string>,
): DiffItem[] {
  const result: DiffItem[] = [];
  for (const field of new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])) {
    if (!(field in before))
      result.push({ kind: "ADDED", field, after: after[field] });
    else if (!(field in after))
      result.push({ kind: "REMOVED", field, before: before[field] });
    else if (before[field] !== after[field])
      result.push({
        kind: "CHANGED",
        field,
        before: before[field],
        after: after[field],
      });
  }
  return result;
}
