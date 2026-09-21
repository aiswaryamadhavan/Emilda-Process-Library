import type { ReactNode } from "react";
import { requireProcessAccess } from "@/lib/access";
export default async function ProcessAccessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ processId: string }>;
}) {
  const { processId } = await params;
  await requireProcessAccess(processId);
  return children;
}
