import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { headers } from "next/headers";
import {
  createStarterDraft,
  processStarterDraftSchema,
  processStarterInputSchema,
} from "@/lib/domain/process-starter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const parsed = processStarterInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Add a process name, department, and a clear outcome before creating a starting draft.",
      },
      { status: 400 },
    );

  const fallback = createStarterDraft(parsed.data);
  if (!process.env.OPENAI_API_KEY)
    return Response.json({
      draft: fallback,
      source: "STARTER_TEMPLATE",
      configured: false,
      notice:
        "A practical starting draft was created locally. Connect OpenAI to make future drafts use the saved client profile more deeply.",
    });

  const tenantSlug = (await headers()).get("x-tenant-slug");
  const clientContext = await authorizedClientContext(tenantSlug);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.1-mini",
      store: false,
      instructions: `You are Emilda's process design assistant. Create a conservative, editable starting draft for a real owner-led business. Use only the supplied client context and process answers. Never invent a named person, legal requirement, system capability, approval limit, or policy. Put every inference in assumptions and every important gap in unansweredQuestions. The structured graph is a draft: use one START, one END, clear action titles, actor roles rather than invented names, an evidence point, and an exception loop. Preserve business logic exactly as provided.`,
      input: `AUTHORIZED CLIENT CONTEXT\n${clientContext}\n\nPROCESS DISCOVERY ANSWERS\n${JSON.stringify(parsed.data)}`,
      text: {
        format: zodTextFormat(
          processStarterDraftSchema,
          "emilda_process_starter",
        ),
      },
    });
    const aiDraft = response.output_parsed;
    if (!aiDraft) throw new Error("No structured process draft returned");
    return Response.json({
      draft: aiDraft,
      source: "AI",
      configured: true,
      notice:
        "AI created this starting point from the authorized client profile and your answers. Review every assumption before approval.",
    });
  } catch {
    return Response.json({
      draft: fallback,
      source: "STARTER_TEMPLATE",
      configured: true,
      notice:
        "OpenAI was unavailable, so Emilda created a safe local starting draft. Nothing has been published.",
    });
  }
}
