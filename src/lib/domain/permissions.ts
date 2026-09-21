import type { MembershipRole, ProcessPermission } from "./types";

const rolePermissions: Record<MembershipRole, ProcessPermission[]> = {
  TENANT_ADMIN: [
    "VIEW",
    "DESIGN",
    "COMMENT",
    "UPLOAD_EVIDENCE",
    "AUDIT",
    "MANAGE_ISSUES",
    "APPROVE_RELEASE",
    "MANAGE_RELEASE",
    "MANAGE_ACCESS",
  ],
  PROCESS_GUARDIAN: [
    "VIEW",
    "DESIGN",
    "COMMENT",
    "UPLOAD_EVIDENCE",
    "AUDIT",
    "MANAGE_ISSUES",
    "MANAGE_RELEASE",
  ],
  PROCESS_OWNER: ["VIEW", "COMMENT", "UPLOAD_EVIDENCE", "MANAGE_ISSUES"],
  CONTRIBUTOR: ["VIEW", "COMMENT", "UPLOAD_EVIDENCE"],
  APPROVER: ["VIEW", "COMMENT", "APPROVE_RELEASE"],
  VIEWER: ["VIEW"],
  AUDITOR: ["VIEW", "COMMENT", "UPLOAD_EVIDENCE", "AUDIT"],
};

export function can(
  roles: MembershipRole[],
  permission: ProcessPermission,
): boolean {
  return roles.some((role) => rolePermissions[role].includes(permission));
}

export function canApproveAssignedRelease(
  roles: MembershipRole[],
  assigned: boolean,
): boolean {
  return assigned && can(roles, "APPROVE_RELEASE");
}
