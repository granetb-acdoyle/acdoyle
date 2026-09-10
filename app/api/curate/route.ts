import { createHash } from "node:crypto";
import { supabase } from "@/lib/supabase";
import {
  DispatchConfigError,
  DispatchOutputError,
  runDispatch,
} from "@/lib/dispatch";

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

  try {
    const { result, watsonDecisionRows } = await runDispatch(query);

    const watsonDecisionRowsWithKey = watsonDecisionRows.map((row) => ({
      ...row,
      api_key_id: apiKeyRow.id,
    }));

    const [decrementResult, usageLogResult, watsonDecisionsResult] =
      await Promise.all([
        supabase.rpc("decrement_credits", { key_id: apiKeyRow.id }),
        supabase
          .from("usage_logs")
          .insert({ api_key_id: apiKeyRow.id, query }),
        watsonDecisionRowsWithKey.length > 0
          ? supabase.from("watson_decisions").insert(watsonDecisionRowsWithKey)
          : Promise.resolve({ error: null }),
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
    if (watsonDecisionsResult.error) {
      console.error(
        "Failed to insert watson_decisions:",
        watsonDecisionsResult.error
      );
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof DispatchConfigError) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof DispatchOutputError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Anthropic API request failed: ${message}` },
      { status: 502 }
    );
  }
}
