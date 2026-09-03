import Anthropic from "@anthropic-ai/sdk";

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

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

    return Response.json(toolUseBlock.input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Anthropic API request failed: ${message}` },
      { status: 502 }
    );
  }
}
