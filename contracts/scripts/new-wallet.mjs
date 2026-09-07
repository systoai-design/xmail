// Generates a throwaway TESTNET deployer key.
// This key is for Robinhood Chain testnet (46630) only. Never fund it on mainnet,
// never reuse it anywhere that holds value -- it lives in a plaintext .env on disk.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { existsSync, appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));

if (existsSync(envPath) && readFileSync(envPath, "utf8").includes("DEPLOYER_PRIVATE_KEY")) {
  const existing = readFileSync(envPath, "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/);
  if (existing) {
    console.log("Deployer already exists:", privateKeyToAccount(existing[1]).address);
    process.exit(0);
  }
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
appendFileSync(envPath, `\n# TESTNET ONLY -- do not fund on mainnet\nDEPLOYER_PRIVATE_KEY=${privateKey}\n`);
console.log("Deployer address:", account.address);
console.log("Private key written to contracts/.env (gitignored)");
