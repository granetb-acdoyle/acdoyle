import Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are acdoyle's dispatcher. For every incoming query, pick the single best-fit
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
   on acdoyle's unique edge (including but not limited to proprietary data).
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

export const SHERLOCK_TOOL: Anthropic.Tool = {
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

export const WATSON_TOOL: Anthropic.Tool = {
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

export const MORIARTY_TOOL: Anthropic.Tool = {
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

export const COMMISSION_RATE = 0.05;

export const MORIARTY_DISCLAIMER =
  "This is a general business recommendation, not financial, investment, or securities advice. asfo/Moriarty assumes no responsibility for outcomes of acting on it. Evaluate independently before proceeding.";

export const UPSELL_PRICES_USDC: Record<string, number> = {
  none: 0,
  deep_dive: 2,
  monitoring: 5,
  execution: 10,
};

/** Thrown when ANTHROPIC_API_KEY is missing — callers should map this to a 500. */
export class DispatchConfigError extends Error {}

/** Thrown when the model doesn't return usable structured output — callers should map this to a 502. */
export class DispatchOutputError extends Error {}

export type WatsonDecisionRow = {
  category: string;
  target: string;
  amount_recommended: number;
};

export type DispatchOutcome = {
  result: Record<string, unknown>;
  watsonDecisionRows: WatsonDecisionRow[];
};

/**
 * Runs the core persona-dispatch logic against the Anthropic API. Pure
 * dispatch only — no Supabase access, no credit metering, no logging.
 * Callers are responsible for auth, metering, and persistence.
 */
export async function runDispatch(query: string): Promise<DispatchOutcome> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new DispatchConfigError(
      "ANTHROPIC_API_KEY is not configured on the server."
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

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
    throw new DispatchOutputError("Model did not return structured output.");
  }

  const toolInput = toolUseBlock.input as Record<string, unknown>;
  let result: Record<string, unknown> = { ...toolInput };

  const upsellTier =
    typeof toolInput.upsell_tier === "string" ? toolInput.upsell_tier : "none";
  const upsellPriceUsdc = UPSELL_PRICES_USDC[upsellTier] ?? 0;
  result = { ...result, upsell_price_usdc: upsellPriceUsdc };

  let watsonDecisionRows: WatsonDecisionRow[] = [];

  if (toolUseBlock.name === WATSON_TOOL.name) {
    const totalAllocated = Number(toolInput.total_allocated) || 0;
    const commissionAmount = totalAllocated * COMMISSION_RATE;
    result = {
      ...result,
      commission_rate: COMMISSION_RATE,
      commission_amount: commissionAmount,
    };

    if (Array.isArray(toolInput.decisions)) {
      watsonDecisionRows = (
        toolInput.decisions as Array<Record<string, unknown>>
      ).map((decision) => ({
        category: String(decision.category ?? ""),
        target: String(decision.target ?? ""),
        amount_recommended: Number(decision.amount) || 0,
      }));
    }
  } else if (toolUseBlock.name === MORIARTY_TOOL.name) {
    result = { ...result, disclaimer: MORIARTY_DISCLAIMER };
  }

  return { result, watsonDecisionRows };
}
