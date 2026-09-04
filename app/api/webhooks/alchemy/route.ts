import { createHmac, timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";

// Circle's official USDC contract on Base Sepolia testnet.
// https://developers.circle.com/stablecoins/usdc-contract-addresses
const USDC_CONTRACT_ADDRESS_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Half of the smallest unit we generate (thousandths of a dollar), so we
// only ever match the intended intent, never a neighboring one.
const AMOUNT_MATCH_TOLERANCE = 0.0005;

interface AlchemyActivity {
  hash?: string;
  fromAddress?: string;
  toAddress?: string;
  value?: number;
  asset?: string;
  category?: string;
  rawContract?: {
    address?: string;
    rawValue?: string;
    decimals?: number;
  };
}

interface AlchemyAddressActivityPayload {
  webhookId?: string;
  id?: string;
  type?: string;
  event?: {
    network?: string;
    activity?: AlchemyActivity[];
  };
}

/**
 * Verifies the `X-Alchemy-Signature` header: a hex-encoded HMAC-SHA256 of
 * the raw request body, keyed with the per-webhook signing key. Must be
 * computed over the exact raw bytes received, before any JSON parsing.
 * https://www.alchemy.com/docs/reference/notify-api-quickstart#validate-the-signature-received
 */
function isValidAlchemySignature(
  rawBody: string,
  signature: string | null,
  signingKey: string
): boolean {
  if (!signature) return false;

  const digest = createHmac("sha256", signingKey)
    .update(rawBody, "utf8")
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "utf8");
  const digestBuffer = Buffer.from(digest, "utf8");

  if (signatureBuffer.length !== digestBuffer.length) return false;
  return timingSafeEqual(signatureBuffer, digestBuffer);
}

function isUsdcTransferToWallet(
  activity: AlchemyActivity,
  walletAddress: string
): activity is AlchemyActivity & { value: number; hash: string } {
  const contractAddress = activity.rawContract?.address;
  return (
    typeof activity.value === "number" &&
    typeof activity.hash === "string" &&
    typeof activity.toAddress === "string" &&
    typeof contractAddress === "string" &&
    contractAddress.toLowerCase() ===
      USDC_CONTRACT_ADDRESS_BASE_SEPOLIA.toLowerCase() &&
    activity.toAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}

async function fulfillMatchingIntent(activity: {
  value: number;
  hash: string;
}) {
  const nowIso = new Date().toISOString();

  const { data: intent, error: lookupError } = await supabase
    .from("topup_intents")
    .select("id, api_key_id, credits_to_grant, expected_amount")
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .gte("expected_amount", activity.value - AMOUNT_MATCH_TOLERANCE)
    .lte("expected_amount", activity.value + AMOUNT_MATCH_TOLERANCE)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error(
      `[alchemy webhook] Failed to look up topup_intents for tx ${activity.hash}:`,
      lookupError
    );
    return;
  }

  if (!intent) {
    console.log(
      `[alchemy webhook] Unmatched USDC transfer: tx=${activity.hash} value=${activity.value} — no pending, unexpired intent at this amount.`
    );
    return;
  }

  // Conditional update on status='pending' makes this the atomic "claim"
  // step: if two webhook deliveries race for the same intent, only one
  // will find it still pending and proceed to grant credits.
  const { data: claimedIntent, error: claimError } = await supabase
    .from("topup_intents")
    .update({ status: "fulfilled", fulfilled_at: nowIso })
    .eq("id", intent.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error(
      `[alchemy webhook] Failed to claim topup_intent ${intent.id} for tx ${activity.hash}:`,
      claimError
    );
    return;
  }

  if (!claimedIntent) {
    console.log(
      `[alchemy webhook] topup_intent ${intent.id} was already fulfilled by another delivery — skipping duplicate credit grant for tx ${activity.hash}.`
    );
    return;
  }

  const { error: incrementError } = await supabase.rpc("increment_credits", {
    key_id: intent.api_key_id,
    amount: intent.credits_to_grant,
  });

  if (incrementError) {
    console.error(
      `[alchemy webhook] Claimed topup_intent ${intent.id} but failed to increment credits for api_key ${intent.api_key_id}:`,
      incrementError
    );
    return;
  }

  console.log(
    `[alchemy webhook] Matched tx=${activity.hash} value=${activity.value} to topup_intent=${intent.id}: granted ${intent.credits_to_grant} credits to api_key=${intent.api_key_id}.`
  );
}

export async function POST(request: Request) {
  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  const walletAddress = process.env.WALLET_ADDRESS;

  if (!signingKey || !walletAddress) {
    return Response.json(
      {
        error:
          "ALCHEMY_WEBHOOK_SIGNING_KEY and WALLET_ADDRESS must be configured on the server.",
      },
      { status: 500 }
    );
  }

  // Must read the raw body (before any JSON parsing) — the signature is
  // computed over the exact bytes Alchemy sent, not a re-serialized object.
  const rawBody = await request.text();
  const signature = request.headers.get("x-alchemy-signature");

  if (!isValidAlchemySignature(rawBody, signature, signingKey)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: AlchemyAddressActivityPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Signature was valid but body wasn't JSON — ack anyway so Alchemy
    // doesn't retry; per the task spec, only signature failures are non-200.
    console.error("[alchemy webhook] Signature valid but body was not valid JSON.");
    return Response.json({ received: true });
  }

  if (payload.type !== "ADDRESS_ACTIVITY") {
    console.log(`[alchemy webhook] Ignoring non-address-activity event: ${payload.type}`);
    return Response.json({ received: true });
  }

  const activities = payload.event?.activity ?? [];

  for (const activity of activities) {
    if (!isUsdcTransferToWallet(activity, walletAddress)) {
      continue;
    }
    await fulfillMatchingIntent(activity);
  }

  return Response.json({ received: true });
}
