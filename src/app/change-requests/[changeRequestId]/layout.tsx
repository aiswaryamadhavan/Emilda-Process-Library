import type { ReactNode } from "react";
import { requireChangeAccess } from "@/lib/access";
export default async function ChangeAccessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ changeRequestId: string }>;
}) {
  const { changeRequestId } = await params;
  await requireChangeAccess(changeRequestId);
  return children;
}
