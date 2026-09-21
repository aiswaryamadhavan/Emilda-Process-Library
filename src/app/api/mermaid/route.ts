import { z } from "zod";
import { exportMermaid, parseMermaid } from "@/lib/domain/mermaid";
import { processGraphSchema } from "@/lib/domain/types";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({ source: z.string().min(1).max(200000) })
    .safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Mermaid source is required and must be under 200 KB." },
      { status: 400 },
    );
  const result = parseMermaid(parsed.data.source);
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function PUT(request: Request) {
  const parsed = processGraphSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "The structured process graph is invalid." },
      { status: 400 },
    );
  return new Response(exportMermaid(parsed.data), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=process.mmd",
      "Cache-Control": "private, no-store",
    },
  });
}
