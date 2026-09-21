import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReleaseDocument } from "@/lib/pdf/release-document";
import { canAccessRelease } from "@/lib/access";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await params;
  if (!(await canAccessRelease(releaseId)))
    return Response.json({ error: "Release not found." }, { status: 404 });
  const buffer = await renderToBuffer(React.createElement(ReleaseDocument));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        "attachment; filename=Acme-Purchase-Approval-v2.1.pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
