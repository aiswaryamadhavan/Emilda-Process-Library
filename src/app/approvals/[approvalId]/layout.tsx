import type { ReactNode } from "react";
import { requireApprovalAccess } from "@/lib/access";
export default async function ApprovalAccessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ approvalId: string }>;
}) {
  const { approvalId } = await params;
  await requireApprovalAccess(approvalId);
  return children;
}
