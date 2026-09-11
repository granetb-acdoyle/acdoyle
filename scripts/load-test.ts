/**
 * One-shot load test across both payment rails (credit via x-api-key, and
 * x402 via a real signed wallet) and all three personas. Makes real
 * Anthropic API calls and spends real test-USDC — this is NOT run
 * automatically, invoke it deliberately via `npm run test:load`.
 *
 * Same env-var conventions as the other scripts in this folder:
 * BASE_URL defaults to localhost, ASFO_API_KEY is the existing credit-rail
 * key, WALLET_PRIVATE_KEY is the existing x402 signer (same
 * @x402/fetch + x402Client + registerExactEvmScheme pattern as test-x402.ts).
 */
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PAUSE_MS = 1500;

type Persona = "sherlock" | "watson" | "moriarty";
type Rail = "credit" | "x402";

const PERSONAS: Persona[] = ["sherlock", "watson", "moriarty"];
const RAILS: Rail[] = ["credit", "x402"];

const QUERIES: Record<Persona, string[]> = {
  sherlock: [
    "Pick a message queue for a fintech backend processing 5,000 transactions per second with strict ordering requirements.",
    "Choose a frontend state management library for a 40-engineer team migrating off Redux.",
    "Recommend a single database for a multiplayer game server needing sub-10ms reads at 50k concurrent players.",
    "Decide between Kubernetes and a managed PaaS for a 12-person startup with no dedicated ops team.",
    "Select a logging and observability stack for a Python microservices fleet of about 30 services.",
    "Recommend one programming language for a new firmware project on a resource-constrained IoT sensor.",
    "Choose a CDN provider for a media site serving 4K video to a mostly European audience.",
    "Pick a testing framework for a large legacy PHP monolith with almost no existing test coverage.",
    "Decide on a single authentication provider for a B2B SaaS app that needs SSO and SCIM support.",
    "Recommend a vector database for a RAG pipeline indexing 50 million documents with daily updates.",
  ],
  watson: [
    "I have $1,200 to spend on cloud infrastructure this month, allocate it.",
    "Split a $3,000 marketing budget for a solo indie app launch.",
    "Allocate $450 across developer tooling subscriptions for a 5-person team.",
    "I've got $2,500 for conference travel this quarter, decide how to spend it.",
    "Budget $800 for freelance design work on a new landing page.",
    "Allocate $5,000 across paid ads for a Q4 product launch.",
    "I have $650 for security audits on a small open-source project, spend it.",
    "Split a $10,000 hiring budget for contract engineering help this month.",
    "Allocate $300 for API and data provider costs for a weekend hackathon project.",
    "I have $1,800 to spend on customer support tooling, decide the allocation.",
  ],
  moriarty: [
    "How should a solo newsletter writer with 4,000 subscribers start charging for premium content?",
    "What's the best monetization model for a niche mobile game with 10,000 daily active users?",
    "A local bakery wants to launch a subscription box, how should they price it?",
    "How should a freelance photographer package their services to increase average order value?",
    "What pricing strategy should a B2B API startup use for its first paid tier?",
    "A YouTube creator with 50,000 subscribers wants to diversify beyond ad revenue, what should they do?",
    "How should a boutique fitness studio structure membership tiers to reduce churn?",
    "What's the best way for an indie game developer to monetize a completed single-player game post-launch?",
    "A husband-and-wife pottery studio wants to sell online, what's the smartest first monetization move?",
    "How should a two-person dev-tools startup decide between a free tier and a 14-day trial?",
  ],
};

/**
 * Default is 34 runs per persona (18 credit / 16 x402, the same ~9:8 ratio
 * as the original "9 credit / 8 x402 per persona" spec, scaled up so the
 * total across all three personas lands at 102, "about a hundred, evenly
 * spread"). Override with RUNS_PER_BUCKET to change the per-persona total;
 * the credit/x402 split always scales proportionally from that.
 */
const DEFAULT_RUNS_PER_PERSONA = 34;
const RUNS_PER_PERSONA =
  Number(process.env.RUNS_PER_BUCKET) > 0
    ? Number(process.env.RUNS_PER_BUCKET)
    : DEFAULT_RUNS_PER_PERSONA;
const CREDIT_RUNS_PER_PERSONA = Math.round((RUNS_PER_PERSONA * 9) / 17);
const X402_RUNS_PER_PERSONA = RUNS_PER_PERSONA - CREDIT_RUNS_PER_PERSONA;

type PlannedCall = { persona: Persona; rail: Rail; query: string };

function buildPlan(): PlannedCall[] {
  const buckets = PERSONAS.flatMap((persona) => [
    { persona, rail: "credit" as Rail, remaining: CREDIT_RUNS_PER_PERSONA, cursor: 0 },
    { persona, rail: "x402" as Rail, remaining: X402_RUNS_PER_PERSONA, cursor: 0 },
  ]);

  const plan: PlannedCall[] = [];
  let bucketIndex = 0;
  let exhaustedStreak = 0;

  while (exhaustedStreak < buckets.length) {
    const bucket = buckets[bucketIndex % buckets.length];
    bucketIndex += 1;

    if (bucket.remaining <= 0) {
      exhaustedStreak += 1;
      continue;
    }
    exhaustedStreak = 0;

    const queries = QUERIES[bucket.persona];
    plan.push({
      persona: bucket.persona,
      rail: bucket.rail,
      query: queries[bucket.cursor % queries.length],
    });
    bucket.cursor += 1;
    bucket.remaining -= 1;
  }

  return plan;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bucketKey(persona: Persona, rail: Rail) {
  return `${persona}:${rail}`;
}

const INSUFFICIENT_FUNDS_KEYWORDS = ["insufficient", "not enough balance", "no credits remaining"];

function looksLikeInsufficientFunds(text: string): boolean {
  const lower = text.toLowerCase();
  return INSUFFICIENT_FUNDS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

type CallOutcome = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  errorMessage?: string;
};

async function callCreditRail(query: string, apiKey: string): Promise<CallOutcome> {
  const startedAt = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/curate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ query }),
    });
    const latencyMs = Date.now() - startedAt;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errorMessage =
        typeof (body as { error?: unknown })?.error === "string"
          ? (body as { error: string }).error
          : `HTTP ${res.status}`;
      return { ok: false, status: res.status, latencyMs, errorMessage };
    }
    return { ok: true, status: res.status, latencyMs };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

async function callX402Rail(
  fetchWithPayment: typeof fetch,
  query: string
): Promise<CallOutcome> {
  const startedAt = Date.now();
  try {
    const res = await fetchWithPayment(`${BASE_URL}/api/curate/x402`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const latencyMs = Date.now() - startedAt;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errorMessage =
        typeof (body as { error?: unknown })?.error === "string"
          ? (body as { error: string }).error
          : `HTTP ${res.status}`;
      return { ok: false, status: res.status, latencyMs, errorMessage };
    }
    return { ok: true, status: res.status, latencyMs };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
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

  const account = privateKeyToAccount(walletPrivateKey as `0x${string}`);
  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: account,
    networks: ["eip155:84532"],
  });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const plan = buildPlan();
  const total = plan.length;

  console.log(`=== Load test: ${total} calls against ${BASE_URL} ===`);
  console.log(
    `Per persona: ${CREDIT_RUNS_PER_PERSONA} credit-rail + ${X402_RUNS_PER_PERSONA} x402-rail (x3 personas)`
  );
  console.log(`Signer address: ${account.address}\n`);

  let creditRailEnabled = true;
  let x402RailEnabled = true;
  const notices: string[] = [];

  const summary: Record<string, { attempted: number; succeeded: number; failed: number }> = {};
  for (const persona of PERSONAS) {
    for (const rail of RAILS) {
      summary[bucketKey(persona, rail)] = { attempted: 0, succeeded: 0, failed: 0 };
    }
  }

  for (let i = 0; i < plan.length; i++) {
    const call = plan[i];
    const progress = `[${i + 1}/${total}]`;

    if (call.rail === "credit" && !creditRailEnabled) continue;
    if (call.rail === "x402" && !x402RailEnabled) continue;

    const bucket = summary[bucketKey(call.persona, call.rail)];
    bucket.attempted += 1;

    const outcome =
      call.rail === "credit"
        ? await callCreditRail(call.query, asfoApiKey)
        : await callX402Rail(fetchWithPayment, call.query);

    if (outcome.ok) {
      bucket.succeeded += 1;
      console.log(
        `${progress} persona=${call.persona} rail=${call.rail} status=${outcome.status} latency=${outcome.latencyMs}ms OK`
      );
    } else {
      bucket.failed += 1;
      console.log(
        `${progress} persona=${call.persona} rail=${call.rail} status=${outcome.status ?? "ERR"} latency=${outcome.latencyMs}ms FAILED (${outcome.errorMessage})`
      );

      const exhausted = outcome.errorMessage ? looksLikeInsufficientFunds(outcome.errorMessage) : false;
      const creditExhausted = call.rail === "credit" && (outcome.status === 402 || exhausted);
      const x402Exhausted = call.rail === "x402" && exhausted;

      if (creditExhausted && creditRailEnabled) {
        creditRailEnabled = false;
        const notice = "Credit rail exhausted (insufficient credits) — stopping further credit-rail calls, continuing x402-rail calls only.";
        console.log(`\n!!! ${notice}\n`);
        notices.push(notice);
      }
      if (x402Exhausted && x402RailEnabled) {
        x402RailEnabled = false;
        const notice = "x402 rail exhausted (insufficient test-USDC) — stopping further x402-rail calls, continuing credit-rail calls only.";
        console.log(`\n!!! ${notice}\n`);
        notices.push(notice);
      }
    }

    if (!creditRailEnabled && !x402RailEnabled) {
      notices.push("Both rails exhausted — stopping the run early.");
      break;
    }

    await sleep(PAUSE_MS);
  }

  logSummary(summary, notices);
}

function logSummary(
  summary: Record<string, { attempted: number; succeeded: number; failed: number }>,
  notices: string[]
) {
  console.log("\n=== Summary ===");
  console.log(
    `${"Persona".padEnd(10)} ${"Rail".padEnd(8)} ${"Attempted".padEnd(10)} ${"Succeeded".padEnd(10)} Failed`
  );

  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;

  for (const persona of PERSONAS) {
    for (const rail of RAILS) {
      const bucket = summary[bucketKey(persona, rail)];
      totalAttempted += bucket.attempted;
      totalSucceeded += bucket.succeeded;
      totalFailed += bucket.failed;
      console.log(
        `${persona.padEnd(10)} ${rail.padEnd(8)} ${String(bucket.attempted).padEnd(10)} ${String(bucket.succeeded).padEnd(10)} ${bucket.failed}`
      );
    }
  }

  console.log("-".repeat(50));
  console.log(
    `${"TOTAL".padEnd(10)} ${"".padEnd(8)} ${String(totalAttempted).padEnd(10)} ${String(totalSucceeded).padEnd(10)} ${totalFailed}`
  );

  if (notices.length > 0) {
    console.log("\n=== Early-stop notices ===");
    for (const notice of notices) {
      console.log(`- ${notice}`);
    }
  }
}

main().catch((error) => {
  console.error("Load test failed:", error);
  process.exit(1);
});
