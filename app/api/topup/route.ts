import { createHash, randomInt } from "node:crypto";
import { supabase } from "@/lib/supabase";

const CREDITS_PER_USD = 100;
const INTENT_EXPIRY_MINUTES = 30;

/**
 * Appends a random thousandths-of-a-dollar suffix (.001-.999) to a whole
 * dollar amount, e.g. 5 -> 5.037. This makes each pending intent's amount
 * distinguishable on-chain even when multiple intents share the same
 * whole-dollar amount.
 */
function generateExpectedAmount(usdAmount: number): number {
  const suffixThousandths = randomInt(1, 1000); // 1..999 inclusive
  return Number((usdAmount + suffixThousandths / 1000).toFixed(3));
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const apiKey = (body as { api_key?: unknown })?.api_key;
  const usdAmount = (body as { usd_amount?: unknown })?.usd_amount;

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return Response.json(
      { error: "Field \"api_key\" is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  if (
    typeof usdAmount !== "number" ||
    !Number.isInteger(usdAmount) ||
    usdAmount <= 0
  ) {
    return Response.json(
      {
        error:
          "Field \"usd_amount\" is required and must be a positive whole number.",
      },
      { status: 400 }
    );
  }

  const walletAddress = process.env.WALLET_ADDRESS;
  if (!walletAddress) {
    return Response.json(
      { error: "WALLET_ADDRESS is not configured on the server." },
      { status: 500 }
    );
  }

  const keyHash = createHash("sha256").update(apiKey).digest("hex");

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

  const expectedAmount = generateExpectedAmount(usdAmount);
  const creditsToGrant = usdAmount * CREDITS_PER_USD;
  const expiresAt = new Date(
    Date.now() + INTENT_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();

  const { error: insertError } = await supabase.from("topup_intents").insert({
    api_key_id: apiKeyRow.id,
    expected_amount: expectedAmount,
    credits_to_grant: creditsToGrant,
    expires_at: expiresAt,
  });

  if (insertError) {
    return Response.json(
      { error: `Failed to create top-up intent: ${insertError.message}` },
      { status: 500 }
    );
  }

  return Response.json({
    expected_amount: expectedAmount,
    wallet_address: walletAddress,
  });
}
