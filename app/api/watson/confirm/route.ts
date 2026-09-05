import { createHash } from "node:crypto";
import { supabase } from "@/lib/supabase";

// Placeholder — % of realized savings vs. market baseline, needs real
// calibration once a pilot category exists.
const SAVINGS_COMMISSION_RATE = 0.3;

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const decisionId = body?.decision_id;
  const actualAmountPaid = body?.actual_amount_paid;
  const marketBaselineAmount = body?.market_baseline_amount;

  if (typeof decisionId !== "string" || decisionId.trim().length === 0) {
    return Response.json(
      { error: "Field \"decision_id\" is required." },
      { status: 400 }
    );
  }
  if (
    typeof actualAmountPaid !== "number" ||
    !Number.isFinite(actualAmountPaid) ||
    actualAmountPaid < 0
  ) {
    return Response.json(
      {
        error:
          "Field \"actual_amount_paid\" is required and must be a non-negative number.",
      },
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
    .select("id")
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

  const { data: decisionRow, error: decisionLookupError } = await supabase
    .from("watson_decisions")
    .select("id, api_key_id")
    .eq("id", decisionId)
    .maybeSingle();

  if (decisionLookupError) {
    return Response.json(
      { error: `Failed to look up decision: ${decisionLookupError.message}` },
      { status: 500 }
    );
  }
  if (!decisionRow || decisionRow.api_key_id !== apiKeyRow.id) {
    return Response.json(
      { error: "Decision not found for this API key." },
      { status: 404 }
    );
  }

  const baseline =
    typeof marketBaselineAmount === "number" &&
    Number.isFinite(marketBaselineAmount)
      ? marketBaselineAmount
      : null;
  const commissionOwed =
    baseline !== null
      ? Math.max(0, baseline - actualAmountPaid) * SAVINGS_COMMISSION_RATE
      : null;

  const { error: updateError } = await supabase
    .from("watson_decisions")
    .update({
      status: "confirmed",
      actual_amount_paid: actualAmountPaid,
      market_baseline_amount: baseline,
      commission_owed: commissionOwed,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", decisionId);

  if (updateError) {
    return Response.json(
      { error: `Failed to update decision: ${updateError.message}` },
      { status: 500 }
    );
  }

  return Response.json({
    decision_id: decisionId,
    status: "confirmed",
    actual_amount_paid: actualAmountPaid,
    market_baseline_amount: baseline,
    commission_owed: commissionOwed,
  });
}
