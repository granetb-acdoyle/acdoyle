/**
 * End-to-end test of the x402 payment rail: acts as an x402 CLIENT, signing
 * a real payment authorization with WALLET_PRIVATE_KEY, and makes one real
 * paid POST call to /api/curate/x402 on Base Sepolia testnet.
 */
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TEST_QUERY =
  "Find the best CI provider for a 200-repo org under $500/mo.";

function logStage(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
  if (!walletPrivateKey) {
    console.error("Missing WALLET_PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  logStage("Stage 1: Building the x402-aware fetch client");
  const account = privateKeyToAccount(walletPrivateKey as `0x${string}`);
  console.log(`Signer address: ${account.address}`);
  console.log("Network: eip155:84532 (Base Sepolia)");

  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: account,
    networks: ["eip155:84532"],
  });

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  logStage("Stage 2: Making the paid POST call to /api/curate/x402");
  console.log(`POST ${BASE_URL}/api/curate/x402`);
  console.log("Body:", JSON.stringify({ query: TEST_QUERY }, null, 2));

  const response = await fetchWithPayment(`${BASE_URL}/api/curate/x402`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: TEST_QUERY }),
  });

  const result = await response.json();

  logStage("Stage 3: Response from /api/curate/x402");
  console.log(`Status: ${response.status} ${response.statusText}`);

  const paymentResponseHeader = response.headers.get("PAYMENT-RESPONSE");
  if (paymentResponseHeader) {
    console.log(
      "Payment settlement:",
      JSON.stringify(decodePaymentResponseHeader(paymentResponseHeader), null, 2)
    );
  } else {
    console.log("No PAYMENT-RESPONSE header present.");
  }

  console.log("Body:", JSON.stringify(result, null, 2));

  if (!response.ok) {
    console.error(`x402 call failed (${response.status}).`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("x402 test failed:", error);
  process.exit(1);
});
