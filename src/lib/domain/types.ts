import { z } from "zod";

export const membershipRoles = [
  "TENANT_ADMIN",
  "PROCESS_GUARDIAN",
  "PROCESS_OWNER",
  "CONTRIBUTOR",
  "APPROVER",
  "VIEWER",
  "AUDITOR",
] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const processPermissions = [
  "VIEW",
  "DESIGN",
  "COMMENT",
  "UPLOAD_EVIDENCE",
  "AUDIT",
  "MANAGE_ISSUES",
  "APPROVE_RELEASE",
  "MANAGE_RELEASE",
  "MANAGE_ACCESS",
] as const;
export type ProcessPermission = (typeof processPermissions)[number];

export const nodeTypes = [
  "START",
  "ACTION",
  "DECISION",
  "HANDOFF",
  "WAIT",
  "DATA",
  "SUBPROCESS",
  "END",
] as const;
export type ProcessNodeType = (typeof nodeTypes)[number];

export const processNodeSchema = z.object({
  id: z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/),
  type: z.enum(nodeTypes),
  title: z.string().min(1).max(160),
  actor: z.string().optional(),
  action: z.string().optional(),
  timing: z.string().optional(),
  why: z.string().optional(),
  evidence: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
});

export const processEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().max(120).optional(),
});

export const processGraphSchema = z.object({
  direction: z.enum(["TD", "TB", "LR", "RL", "BT"]).default("TD"),
  nodes: z.array(processNodeSchema).min(2).max(400),
  edges: z.array(processEdgeSchema).max(800),
});
export type ProcessGraph = z.infer<typeof processGraphSchema>;

export const versionStatuses = [
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVAL_PENDING",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "SUPERSEDED",
  "RETIRED",
] as const;
export type ProcessVersionStatus = (typeof versionStatuses)[number];
export const releaseStatuses = [
  "PREPARING",
  "SENT_FOR_APPROVAL",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
] as const;
export type ReleaseStatus = (typeof releaseStatuses)[number];
export const issueStatuses = [
  "OPEN",
  "INVESTIGATING",
  "ACTION_ASSIGNED",
  "RESOLVED",
  "VERIFIED",
  "CLOSED",
] as const;
export type IssueStatus = (typeof issueStatuses)[number];
export const changeRequestStatuses = [
  "PROPOSED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "IMPLEMENTED",
  "VERIFIED",
] as const;
export type ChangeRequestStatus = (typeof changeRequestStatuses)[number];
export type HealthStatus =
  | "HEALTHY"
  | "NEEDS_ATTENTION"
  | "CRITICAL"
  | "NOT_ENOUGH_DATA";

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  roles: MembershipRole[];
  membershipId: string;
}

export interface HealthComputation {
  status: HealthStatus;
  score: number | null;
  coverage: number;
  factors: Partial<
    Record<"adherence" | "outcome" | "evidence" | "sla" | "issues", number>
  >;
  forcedCritical: boolean;
}

export interface SearchHit {
  id: string;
  type:
    | "Process"
    | "Step"
    | "Issue"
    | "Governance Note"
    | "Version"
    | "Attachment";
  title: string;
  excerpt: string;
  href: string;
  processId?: string;
}

export interface AiCitation {
  searchDocumentId: string;
  label: string;
  href: string;
}
