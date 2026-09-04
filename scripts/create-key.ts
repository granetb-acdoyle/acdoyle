import { randomBytes, createHash } from "node:crypto";
import { supabase } from "../lib/supabase";

async function main() {
  const rawKey = randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const { error } = await supabase
    .from("api_keys")
    .insert({ key_hash: keyHash, credits_remaining: 100 });

  if (error) {
    console.error("Failed to create API key:", error.message);
    process.exit(1);
  }

  console.log(
    "API key created with 100 credits. Save this now — it will not be shown again:"
  );
  console.log(rawKey);
}

main();
