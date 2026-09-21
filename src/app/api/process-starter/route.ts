import OpenAI from "openai";
import { headers } from "next/headers";
import {
  createStarterDraft,
  processStarterInputSchema,
} from "@/lib/domain/process-starter";
import { processGraphSchema } from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const diagramSourceExtensions = /\.(html?|mmd|mermaid|txt)$/i;

function isDiagramSource(file: File) {
  return (
    file.type === "text/html" ||
    file.type === "text/plain" ||
    diagramSourceExtensions.test(file.name)
  );
}

function sourceFromHtml(value: string) {
  const mermaidBlock = value.match(
    /<(?:div|pre|code)[^>]*class=["'][^"']*mermaid[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|pre|code)>/i,
  )?.[1];
  const source = mermaidBlock ?? value;
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function authorizedClientContext(tenantSlug: string | null) {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !tenantSlug) return "No saved client profile is available.";
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, timezone")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (!tenant) return "No authorized client profile is available.";
  const { data: profile } = await supabase
    .from("tenant_profiles")
    .select(
      "industry, business_model, company_size, operating_locations, products_services, customer_types, systems_used, communication_channels, operational_challenges, business_goals, owner_dependencies, compliance_requirements, decision_making_style, seasonality",
    )
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!profile) return `${tenant.name}; timezone ${tenant.timezone}.`;
  return JSON.stringify({
    company: tenant.name,
    timezone: tenant.timezone,
    ...profile,
  }).slice(0, 12000);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const rawInput = form?.get("input");
  const diagram = form?.get("diagram");
  let input: unknown = null;
  if (typeof rawInput === "string") {
    try {
      input = JSON.parse(rawInput);
    } catch {
      input = null;
    }
  }
  const parsed = processStarterInputSchema.safeParse(input);
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Add a process name, department, and a clear outcome before creating a starting draft.",
      },
      { status: 400 },
    );

  if (!diagram || typeof diagram === "string")
    return Response.json(
      {
        error: "Attach a PNG, JPEG, WebP, Mermaid, text, or HTML diagram file.",
      },
      { status: 400 },
    );
  const diagramFile = diagram;
  const isImage = allowedImageTypes.has(diagramFile.type);
  const isSource = isDiagramSource(diagramFile);
  if (!isImage && !isSource)
    return Response.json(
      {
        error: "Attach a PNG, JPEG, WebP, Mermaid, text, or HTML diagram file.",
      },
      { status: 400 },
    );
  if (
    diagramFile.size < 1 ||
    diagramFile.size > (isImage ? 10 : 0.2) * 1024 * 1024
  )
    return Response.json(
      {
        error: isImage
          ? "Diagram images must be under 10 MB."
          : "Diagram source files must be under 200 KB.",
      },
      { status: 400 },
    );

  if (!process.env.OPENAI_API_KEY)
    return Response.json(
      {
        error:
          "Diagram cleanup needs OpenAI vision. Add OPENAI_API_KEY, then submit the photo again.",
      },
      { status: 503 },
    );

  const tenantSlug = (await headers()).get("x-tenant-slug");
  const clientContext = await authorizedClientContext(tenantSlug);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const diagramContent = isImage
    ? [
        {
          type: "input_image" as const,
          image_url: `data:${diagramFile.type};base64,${Buffer.from(await diagramFile.arrayBuffer()).toString("base64")}`,
          detail: "high" as const,
        },
      ]
    : [
        {
          type: "input_text" as const,
          text: `USER-SUPPLIED DIAGRAM SOURCE (${diagramFile.name})\n${diagramFile.type === "text/html" ? sourceFromHtml(await diagramFile.text()) : await diagramFile.text()}`,
        },
      ];
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      store: false,
      instructions: `You are Emilda's diagram transcription assistant. The attached image or source file is the sole source of truth for workflow structure. Transcribe and clean the user's diagram into a valid structured graph; do not invent, remove, reorder, or infer workflow steps, decisions, branches, labels, or connections from the written answers. The answers and client context may only clarify spelling, role names, evidence, and concise wording already visible in the supplied diagram. Preserve uncertainty by adding "To confirm" to unclear visible text. Use stable snake_case node and edge ids, exactly one START and one END when they are shown, non-overlapping left-to-right positions, concise titles, and explicit branch labels. Never add a best-practice exception loop unless it exists in the diagram. Respond with JSON only: {"direction":"LR","nodes":[{"id":"...","type":"START|ACTION|DECISION|HANDOFF|WAIT|DATA|SUBPROCESS|END","title":"...","actor":"optional","action":"optional","timing":"optional","why":"optional","evidence":"optional","position":{"x":0,"y":0}}],"edges":[{"id":"...","source":"...","target":"...","label":"optional"}]}.`,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `AUTHORIZED CLIENT CONTEXT (wording only)\n${clientContext}\n\nPROCESS DISCOVERY ANSWERS (wording only)\n${JSON.stringify(parsed.data)}\n\nTranscribe the user-supplied process diagram or diagram source below. Return JSON only.`,
            },
            ...diagramContent,
          ],
        },
      ],
      text: { format: { type: "json_object" } },
    });
    const graph = processGraphSchema.safeParse(
      JSON.parse(response.output_text),
    );
    if (!graph.success)
      throw new Error(
        "AI returned a diagram that did not contain a valid graph",
      );
    const draft = { ...createStarterDraft(parsed.data), graph: graph.data };
    return Response.json({
      draft,
      source: "AI",
      configured: true,
      notice:
        "AI cleaned the diagram you supplied. It did not create workflow logic from the questionnaire. Compare every step and connection with the original photo before saving.",
    });
  } catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    console.error("Process diagram cleanup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
      status,
    });
    if (status === 401)
      return Response.json(
        {
          error:
            "OpenAI rejected the API key. Replace it with a new project key.",
        },
        { status: 502 },
      );
    if (status === 404)
      return Response.json(
        {
          error:
            "The configured OpenAI model is unavailable. Set OPENAI_MODEL=gpt-5-mini and restart the app.",
        },
        { status: 502 },
      );
    if (status === 429)
      return Response.json(
        {
          error:
            "OpenAI has no available API capacity for this key. Check billing and usage limits, then try again.",
        },
        { status: 429 },
      );
    return Response.json(
      {
        error:
          "The diagram could not be read clearly. Retake the photo in good light with the full diagram visible, then try again.",
      },
      { status: 422 },
    );
  }
}
