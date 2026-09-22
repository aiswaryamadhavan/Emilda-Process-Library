export const DEMO_USER_COOKIE = "emilda-demo-user";

export const allowedUsers = [
  {
    name: "Paul",
    email: "paul@emildasolutions.com",
    role: "Owner",
    canCreateProcesses: false,
    canCreateGovernance: false,
    canViewAll: true,
  },
  {
    name: "Aishwarya",
    email: "aiswarya@emildasolutions.com",
    role: "Admin",
    canCreateProcesses: true,
    canCreateGovernance: true,
    canViewAll: false,
  },
] as const;

export type AllowedUser = (typeof allowedUsers)[number];

export function findAllowedUser(email?: string | null) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return allowedUsers.find((user) => user.email === normalized) ?? null;
}

export function isAllowedLoginEmail(email?: string | null) {
  return Boolean(findAllowedUser(email));
}

export function canCreateProcesses(email?: string | null) {
  return findAllowedUser(email)?.canCreateProcesses ?? false;
}

export function canCreateGovernance(email?: string | null) {
  return findAllowedUser(email)?.canCreateGovernance ?? false;
}
