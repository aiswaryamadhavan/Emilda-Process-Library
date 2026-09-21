import type { ReactNode } from "react";
import { requireIssueAccess } from "@/lib/access";
export default async function IssueAccessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  await requireIssueAccess(issueId);
  return children;
}
