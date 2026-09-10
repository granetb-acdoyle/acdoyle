/**
 * Generates acdoyle's dev wallet for Base Sepolia testnet.
 *
 * The private key is never printed or returned — it is written directly to
 * .env.local as WALLET_PRIVATE_KEY. Only the derived public address is
 * printed to the console.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ENV_FILE = path.join(process.cwd(), ".env.local");

function assertEnvFileIsGitIgnored() {
  try {
    execFileSync("git", ["check-ignore", "-q", ENV_FILE]);
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 1) {
      throw new Error(
        `${ENV_FILE} is NOT git-ignored. Refusing to write a private key to a file that could be committed. Add ".env*" to .gitignore first.`
      );
    }
    throw new Error(
      `Could not verify that ${ENV_FILE} is git-ignored (is this a git repository?). Refusing to write a private key until this is confirmed.`
    );
  }
}

function appendWalletKey(privateKey: string) {
  const line = `WALLET_PRIVATE_KEY=${privateKey}`;

  if (existsSync(ENV_FILE)) {
    const existing = readFileSync(ENV_FILE, "utf8");
    if (existing.includes("WALLET_PRIVATE_KEY=")) {
      throw new Error(
        "WALLET_PRIVATE_KEY already exists in .env.local. Refusing to append a duplicate — remove the existing entry first if you want to rotate it."
      );
    }
    const needsLeadingNewline = existing.length > 0 && !existing.endsWith("\n");
    appendFileSync(ENV_FILE, `${needsLeadingNewline ? "\n" : ""}${line}\n`);
  } else {
    appendFileSync(ENV_FILE, `${line}\n`);
  }
}

function main() {
  assertEnvFileIsGitIgnored();

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  appendWalletKey(privateKey);

  console.log("acdoyle dev wallet created for Base Sepolia testnet.");
  console.log(`Address: ${account.address}`);
  console.log("Private key written to .env.local as WALLET_PRIVATE_KEY.");
}

main();
