import type { ReactNode } from "react";
import { requireAuditAccess } from "@/lib/access";
export default async function AuditAccessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = await params;
  await requireAuditAccess(auditId);
  return children;
}
