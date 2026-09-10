import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { supabase } from "@/lib/supabase";
import {
  DispatchConfigError,
  DispatchOutputError,
  runDispatch,
} from "@/lib/dispatch";

const payTo = process.env.WALLET_ADDRESS;
if (!payTo) {
  throw new Error("Missing WALLET_ADDRESS environment variable.");
}

const priceUsd = process.env.X402_PRICE_USD || "0.05";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

/**
 * withX402 settles payment (and fires onAfterSettle) only strictly AFTER this
 * route's handler has already returned its response — confirmed by reading
 * @x402/next's source: it awaits routeHandler(request) first, then calls
 * handleSettlement() with that response. So the settlement tx hash can never
 * be known while the usage_logs row is inserted.
 *
 * @x402/core's processSettlement does, however, explicitly thread the
 * handler's own response (body + headers) through to the settle context as
 * `transportContext` (it's how the library supports response-derived
 * settlement extensions) — and that same object is passed into onAfterSettle.
 * So the handler stamps the usage_logs row id onto a response header, and
 * this hook reads it back off transportContext.responseHeaders to patch in
 * tx_hash on the correct row once settlement completes.
 */
const USAGE_LOG_ID_HEADER = "x-usage-log-id";

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme())
  .onAfterSettle(async (context) => {
    if (!context.result.success || !context.result.transaction) return;

    const transportContext = context.transportContext as
      | { responseHeaders?: Record<string, string> }
      | undefined;
    const usageLogId = transportContext?.responseHeaders?.[USAGE_LOG_ID_HEADER];
    if (!usageLogId) return;

    const { error } = await supabase
      .from("usage_logs")
      .update({ tx_hash: context.result.transaction })
      .eq("id", usageLogId);
    if (error) {
      console.error("Failed to patch tx_hash onto usage log (x402):", error);
    }
  });

async function handler(request: NextRequest): Promise<NextResponse> {
  let query: unknown;

  try {
    const body = await request.json();
    query = body?.query;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Field \"query\" is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  try {
    const { persona, result, watsonDecisionRows } = await runDispatch(query);

    // Generated up front (instead of relying on the DB default) so the same
    // value can be stamped onto a response header for the onAfterSettle
    // hook above to correlate back to this exact row.
    const usageLogId = randomUUID();

    // usage_logs.api_key_id is nullable (verified against the live schema) —
    // there's no api key on this payment rail, so we log with api_key_id: null.
    const { error: usageLogError } = await supabase.from("usage_logs").insert({
      id: usageLogId,
      api_key_id: null,
      query,
      persona,
      payment_method: "x402",
    });
    if (usageLogError) {
      console.error("Failed to insert usage log (x402):", usageLogError);
    }

    // watson_decisions.api_key_id is NOT nullable (verified against the live
    // schema) — there's no api key row to attach on this rail, so skip the
    // insert entirely rather than let a failed insert break a paid response.
    if (watsonDecisionRows.length > 0) {
      console.log(
        "Skipping watson_decisions insert for x402 payment: api_key_id is required on watson_decisions and there is no api key for this rail."
      );
    }

    const response = NextResponse.json(result);
    if (!usageLogError) {
      response.headers.set(USAGE_LOG_ID_HEADER, usageLogId);
    }
    return response;
  } catch (error) {
    if (error instanceof DispatchConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof DispatchOutputError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Anthropic API request failed: ${message}` },
      { status: 502 }
    );
  }
}

export const POST = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: `$${priceUsd}`,
      network: "eip155:84532",
      payTo,
    },
    description: "acdoyle dispatch (Sherlock/Watson/Moriarty), paid per call via x402 on Base Sepolia testnet",
  },
  resourceServer
);
