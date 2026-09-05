/**
 * End-to-end test of the top-up flow: requests a pending intent from
 * /api/topup, pays it on-chain with USDC on Base Sepolia, then polls
 * Supabase until the Alchemy webhook flips the intent to 'fulfilled'.
 */
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { supabase } from "../lib/supabase";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const USDC_CONTRACT_ADDRESS_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USD_AMOUNT = 1;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function logStage(title: string) {
  console.log(`\n=== ${title} ===`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const asfoApiKey = process.env.ASFO_API_KEY;
  if (!asfoApiKey) {
    console.error("Missing ASFO_API_KEY environment variable.");
    process.exit(1);
  }

  const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
  if (!walletPrivateKey) {
    console.error("Missing WALLET_PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  logStage("Stage 1: Requesting a top-up intent from asfo");
  console.log(`POST ${BASE_URL}/api/topup`);
  console.log("Body:", JSON.stringify({ api_key: "<redacted>", usd_amount: USD_AMOUNT }));

  const topupResponse = await fetch(`${BASE_URL}/api/topup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: asfoApiKey, usd_amount: USD_AMOUNT }),
  });

  const topupResult = await topupResponse.json();

  if (!topupResponse.ok) {
    console.error(`Top-up request failed (${topupResponse.status}):`, topupResult);
    process.exit(1);
  }

  const { expected_amount: expectedAmount, wallet_address: walletAddress } =
    topupResult as { expected_amount: number; wallet_address: string };

  console.log(`Expected amount: ${expectedAmount} USDC`);
  console.log(`Wallet address: ${walletAddress}`);

  logStage("Stage 2: Sending USDC on Base Sepolia");
  const account = privateKeyToAccount(walletPrivateKey as `0x${string}`);
  const transport = http();

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport,
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
  });

  const amountInSmallestUnit = parseUnits(expectedAmount.toFixed(6), 6);

  console.log(`From/To (self-transfer): ${account.address}`);
  console.log(`USDC contract: ${USDC_CONTRACT_ADDRESS_BASE_SEPOLIA}`);
  console.log(`Amount: ${expectedAmount} USDC (${amountInSmallestUnit} base units)`);

  const txHash = await walletClient.writeContract({
    address: USDC_CONTRACT_ADDRESS_BASE_SEPOLIA,
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [account.address, amountInSmallestUnit],
  });

  console.log(`Transaction hash: ${txHash}`);

  logStage("Stage 3: Waiting for 1 confirmation");
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });
  console.log(`Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);

  logStage("Stage 4: Polling topup_intents for fulfillment");
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let fulfilled = false;

  while (Date.now() < deadline) {
    const { data: intent, error } = await supabase
      .from("topup_intents")
      .select("id, status, fulfilled_at, credits_to_grant")
      .eq("expected_amount", expectedAmount)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to poll topup_intents:", error.message);
    } else if (intent?.status === "fulfilled") {
      console.log(
        `Intent ${intent.id} is now fulfilled at ${intent.fulfilled_at} (+${intent.credits_to_grant} credits).`
      );
      fulfilled = true;
      break;
    } else {
      console.log(
        `Still ${intent?.status ?? "not found"}... (${Math.round((deadline - Date.now()) / 1000)}s left)`
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  if (!fulfilled) {
    console.log(
      "Timed out after 60s without seeing the intent fulfilled. Check the Alchemy webhook logs."
    );
  }
}

main().catch((error) => {
  console.error("Top-up test failed:", error);
  process.exit(1);
});
