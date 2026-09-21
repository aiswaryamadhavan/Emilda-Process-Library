import OpenAI from "openai";
import { headers } from "next/headers";
import { z } from "zod";
import { citationsForRetrieved } from "@/lib/ai/citations";
import { retrieveAuthorizedDocuments } from "@/lib/ai/retrieval";
const requestSchema = z.object({
  question: z.string().min(3).max(1000),
});
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Ask a clear operational question between 3 and 1,000 characters.",
      },
      { status: 400 },
    );
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? undefined;
  const retrieved = await retrieveAuthorizedDocuments(
    parsed.data.question,
    tenantSlug,
  );
  if (!retrieved.length)
    return Response.json({
      answer:
        "I could not find an authorized source that answers that question. Try a process name, audit, or issue.",
      citations: [],
      configured: Boolean(process.env.OPENAI_API_KEY),
    });
  const fallback = `The main item needing attention is ${retrieved[0].title}. ${retrieved[0].excerpt}`;
  if (!process.env.OPENAI_API_KEY)
    return Response.json({
      answer: fallback,
      citations: citationsForRetrieved(
        retrieved.slice(0, 3).map((item) => item.id),
        retrieved,
      ),
      configured: false,
    });
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = retrieved
    .map((item) => `[${item.id}] ${item.title}: ${item.excerpt}`)
    .join("\n");
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.1-mini",
    store: false,
    input: `You are Ask Emilda. Answer only from the authorized sources below. Be concise, state uncertainty, and cite sources using [source-id]. Do not propose or perform mutations.\n\n${context}\n\nQuestion: ${parsed.data.question}`,
  });
  const ids = [...response.output_text.matchAll(/\[([^\]]+)\]/g)].map(
    (match) => match[1],
  );
  return Response.json({
    answer: response.output_text.replace(/\[[^\]]+\]/g, "").trim(),
    citations: citationsForRetrieved(
      ids.length ? ids : retrieved.slice(0, 3).map((item) => item.id),
      retrieved,
    ),
    configured: true,
  });
}
