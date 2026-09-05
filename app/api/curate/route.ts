import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are asfo's dispatcher. For every incoming query, pick the single best-fit
specialist below and answer fully in that persona's voice, entirely within
the tool call you choose. Do not hedge, and do not pad the response with
disclaimers or generic advice. Never end your answer with open questions
back to the caller — treat every stated constraint as fixed, make the
best reasonable assumption for anything unstated, and note the assumption
briefly inline instead of asking.

1. consult_sherlock — general problem-solving for any well-defined problem
   (not limited to travel). Give one decisive, specific recommendation.
   Favor the non-obvious, well-reasoned answer over the generic first
   answer, and treat every stated constraint as a hard requirement.

2. delegate_to_watson — budget planning. Given a budget and parameters,
   decide concrete allocations as if actually executing them: specific
   vendor or target names where sensible, decisive amounts, no hedging.
   Watson is non-custodial: it never holds or moves the caller's funds
   itself. Its output instructs the calling agent on exactly what to pay
   and where, so the calling agent executes the payment itself.

3. consult_moriarty — business and monetization recommendations, drawing
   on asfo's unique edge (including but not limited to proprietary data).
   Scoped to business and monetization strategy only — never securities,
   investment, or trading advice. Give one decisive, specific
   recommendation for how to make money or find an opportunity. Do not
   include any disclaimer language yourself — that is handled separately,
   outside the model.

Choose exactly one tool per query and fill it out completely.

After your main recommendation, every persona may propose ONE optional
follow-up paid service via the "upsell_tier" field, if a genuinely
valuable one exists. Use "none" if there isn't one — do not force an
upsell. Never state or imply a price yourself in your text: pricing for
each tier is attached by the platform after your response, not by you.`;

const UPSELL_TIER_SCHEMA = {
  type: "string" as const,
  enum: ["none", "deep_dive", "monitoring", "execution"],
  description:
    "If a genuinely valuable follow-up service exists, name its tier: " +
    "'deep_dive' (a materially more thorough version of this same answer), " +
    "'monitoring' (recurring re-checks as conditions change), " +
    "'execution' (asfo helps instruct/coordinate carrying this out). " +
    "Use 'none' if no follow-up is warranted. Never state a price yourself.",
};

const UPSELL_RATIONALE_SCHEMA = {
  type: "string" as const,
  description:
    "One sentence on what the follow-up service would do and why it's " +
    "worth it. If upsell_tier is 'none', briefly say why no follow-up is needed.",
};

const SHERLOCK_TOOL: Anthropic.Tool = {
  name: "consult_sherlock",
  description:
    "Consult Sherlock for a decisive, well-reasoned recommendation on any well-defined problem, generalized beyond travel.",
  input_schema: {
    type: "object",
    properties: {
      problem_summary: {
        type: "string",
        description: "A concise restatement of the problem being solved.",
      },
      recommendation: {
        type: "string",
        description: "The single best, specific recommendation.",
      },
      rationale: {
        type: "string",
        description: "Why this is the right recommendation for this specific problem.",
      },
      caveats: {
        type: "string",
        description: "Important caveats or limitations to be aware of.",
      },
      upsell_tier: UPSELL_TIER_SCHEMA,
      upsell_rationale: UPSELL_RATIONALE_SCHEMA,
    },
    required: [
      "problem_summary",
      "recommendation",
      "rationale",
      "caveats",
      "upsell_tier",
      "upsell_rationale",
    ],
    additionalProperties: false,
  },
};

const WATSON_TOOL: Anthropic.Tool = {
  name: "delegate_to_watson",
  description:
    "Delegate to Watson to plan a budget: decide concrete, specific allocations and instruct the calling agent on exactly what to pay and where. Watson never holds or moves the caller's funds itself.",
  input_schema: {
    type: "object",
    properties: {
      budget_summary: {
        type: "string",
        description: "A concise restatement of the budget and constraints.",
      },
      decisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            target: {
              type: "string",
              description: "The specific vendor, target, or line item.",
            },
            amount: { type: "number" },
            action: {
              type: "string",
              description:
                "The concrete action the calling agent should take to execute this allocation itself " +
                "(the specific purchase, link, or payment instruction) — Watson instructs, it does not pay.",
            },
          },
          required: ["category", "target", "amount", "action"],
          additionalProperties: false,
        },
      },
      total_allocated: { type: "number" },
      unallocated_remainder: { type: "number" },
      notes: { type: "string" },
      upsell_tier: UPSELL_TIER_SCHEMA,
      upsell_rationale: UPSELL_RATIONALE_SCHEMA,
    },
    required: [
      "budget_summary",
      "decisions",
      "total_allocated",
      "unallocated_remainder",
      "notes",
      "upsell_tier",
      "upsell_rationale",
    ],
    additionalProperties: false,
  },
};

const MORIARTY_TOOL: Anthropic.Tool = {
  name: "consult_moriarty",
  description:
    "Consult Moriarty for a decisive recommendation on a business or monetization opportunity — never securities, investment, or trading advice.",
  input_schema: {
    type: "object",
    properties: {
      opportunity_summary: { type: "string" },
      recommendation: { type: "string" },
      rationale: { type: "string" },
      risk_level: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      upsell_tier: UPSELL_TIER_SCHEMA,
      upsell_rationale: UPSELL_RATIONALE_SCHEMA,
    },
    required: [
      "opportunity_summary",
      "recommendation",
      "rationale",
      "risk_level",
      "upsell_tier",
      "upsell_rationale",
    ],
    additionalProperties: false,
  },
};

const COMMISSION_RATE = 0.05;

const MORIARTY_DISCLAIMER =
  "This is a general business recommendation, not financial, investment, or securities advice. asfo/Moriarty assumes no responsibility for outcomes of acting on it. Evaluate independently before proceeding.";

const UPSELL_PRICES_USDC: Record<string, number> = {
  none: 0,
  deep_dive: 2,
  monitoring: 5,
  execution: 10,
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
      tools: [SHERLOCK_TOOL, WATSON_TOOL, MORIARTY_TOOL],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: query }],
    });

    const toolUseBlock = message.content.find(
      (block) =>
        block.type === "tool_use" &&
        (block.name === SHERLOCK_TOOL.name ||
          block.name === WATSON_TOOL.name ||
          block.name === MORIARTY_TOOL.name)
    );
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return Response.json(
        { error: "Model did not return structured output." },
        { status: 502 }
      );
    }

    const toolInput = toolUseBlock.input as Record<string, unknown>;
    let result: Record<string, unknown> = { ...toolInput };

    const upsellTier =
      typeof toolInput.upsell_tier === "string" ? toolInput.upsell_tier : "none";
    const upsellPriceUsdc = UPSELL_PRICES_USDC[upsellTier] ?? 0;
    result = { ...result, upsell_price_usdc: upsellPriceUsdc };

    if (toolUseBlock.name === WATSON_TOOL.name) {
      const totalAllocated = Number(toolInput.total_allocated) || 0;
      const commissionAmount = totalAllocated * COMMISSION_RATE;
      result = {
        ...result,
        commission_rate: COMMISSION_RATE,
        commission_amount: commissionAmount,
      };
    } else if (toolUseBlock.name === MORIARTY_TOOL.name) {
      result = { ...result, disclaimer: MORIARTY_DISCLAIMER };
    }

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
