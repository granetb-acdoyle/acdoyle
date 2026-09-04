import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are asfo, a luxury travel curation agent. You do not generate generic
itineraries — you make defensible, opinionated recommendations a discerning
human concierge would stand behind.

For every query, apply this rubric:
1. Exclusivity signal — is this findable on the first page of Google? If yes,
   dig deeper or explicitly justify why it still belongs.
2. Specificity over breadth — one exceptional, well-reasoned pick beats five
   generic ones. Name the actual property, guide, table, or experience.
3. Rationale — every recommendation includes WHY it fits this specific
   traveler's stated intent, not a generic description.
4. Constraints honored — budget, dates, party size, and stated preferences
   are hard constraints, not suggestions.

Output valid JSON matching this shape:
{
  "query_summary": string,
  "recommendations": [
    {
      "name": string,
      "category": string,
      "rationale": string,
      "exclusivity_signal": string,
      "practical_notes": string
    }
  ],
  "follow_up_questions": string[]
}

Do not pad the response with disclaimers or generic travel advice. If the
query is too vague to curate well, ask a sharp follow-up question instead
of guessing.`;

const CURATE_TOOL: Anthropic.Tool = {
  name: "submit_curation",
  description:
    "Submit the curated luxury travel recommendations for the traveler's query.",
  input_schema: {
    type: "object",
    properties: {
      query_summary: {
        type: "string",
        description: "A concise restatement of the traveler's intent.",
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The actual property, guide, table, or experience.",
            },
            category: { type: "string" },
            rationale: {
              type: "string",
              description:
                "Why this fits this specific traveler's stated intent.",
            },
            exclusivity_signal: {
              type: "string",
              description:
                "Why this isn't just a first-page-of-Google generic pick.",
            },
            practical_notes: { type: "string" },
          },
          required: [
            "name",
            "category",
            "rationale",
            "exclusivity_signal",
            "practical_notes",
          ],
          additionalProperties: false,
        },
      },
      follow_up_questions: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["query_summary", "recommendations", "follow_up_questions"],
    additionalProperties: false,
  },
};

export async function POST(request: Request) {
  let query: unknown;

  try {
    const body = await request.json();
    query = body?.query;
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (typeof query !== "string" || query.trim().length === 0) {
    return Response.json(
      { error: "Field \"query\" is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  const providedKey = request.headers.get("x-api-key");
  if (!providedKey) {
    return Response.json(
      { error: "Missing \"x-api-key\" header." },
      { status: 401 }
    );
  }

  const keyHash = createHash("sha256").update(providedKey).digest("hex");

  const { data: apiKeyRow, error: apiKeyLookupError } = await supabase
    .from("api_keys")
    .select("id, credits_remaining")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (apiKeyLookupError) {
    return Response.json(
      { error: `Failed to validate API key: ${apiKeyLookupError.message}` },
      { status: 500 }
    );
  }

  if (!apiKeyRow) {
    return Response.json({ error: "Invalid API key." }, { status: 401 });
  }

  if (apiKeyRow.credits_remaining <= 0) {
    return Response.json(
      { error: "No credits remaining for this API key." },
      { status: 402 }
    );
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [CURATE_TOOL],
      tool_choice: { type: "tool", name: CURATE_TOOL.name },
      messages: [{ role: "user", content: query }],
    });

    const toolUseBlock = message.content.find(
      (block) => block.type === "tool_use" && block.name === CURATE_TOOL.name
    );
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return Response.json(
        { error: "Model did not return structured output." },
        { status: 502 }
      );
    }

    const result = toolUseBlock.input;

    const [decrementResult, usageLogResult] = await Promise.all([
      supabase.rpc("decrement_credits", { key_id: apiKeyRow.id }),
      supabase
        .from("usage_logs")
        .insert({ api_key_id: apiKeyRow.id, query }),
    ]);

    if (decrementResult.error) {
      console.error(
        "Failed to decrement credits_remaining:",
        decrementResult.error
      );
    }
    if (usageLogResult.error) {
      console.error("Failed to insert usage log:", usageLogResult.error);
    }

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Anthropic API request failed: ${message}` },
      { status: 502 }
    );
  }
}
