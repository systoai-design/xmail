/**
 * Deploys KeyRegistry + MessageAnchor, then immediately exercises both on-chain so the
 * run produces real, clickable proof rather than just two addresses.
 *
 * Proof produced:
 *   1. a KeyRegistry.registerKey tx  -> the deployer's public key is on chain
 *   2. a MessageAnchor.anchor tx     -> a message commitment is on chain
 *   3. a read-back verify() call     -> the chain confirms the commitment
 */
import { network } from "hardhat";
import { keccak256, encodePacked, toHex, formatEther } from "viem";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXPLORERS: Record<number, string> = {
  46630: "https://explorer.testnet.chain.robinhood.com",
  4663: "https://robinhoodchain.blockscout.com",
};

const { viem, networkName } = await network.connect();

const publicClient = await viem.getPublicClient();
const [wallet] = await viem.getWalletClients();

if (!wallet) {
  throw new Error(
    "No deployer account. Set DEPLOYER_PRIVATE_KEY in contracts/.env (run: npm run wallet:new)."
  );
}

const chainId = await publicClient.getChainId();
const explorer = EXPLORERS[chainId] ?? "";
const deployer = wallet.account.address;
const balance = await publicClient.getBalance({ address: deployer });

console.log(`\nnetwork   ${networkName} (chainId ${chainId})`);
console.log(`deployer  ${deployer}`);
console.log(`balance   ${formatEther(balance)} ETH\n`);

if (balance === 0n) {
  throw new Error(
    `Deployer ${deployer} has no ETH.\n` +
      `Fund it at https://faucet.testnet.chain.robinhood.com ` +
      `(needs Cloudflare + Google sign-in, so a human has to do it), then re-run.`
  );
}

// ---- deploy ----------------------------------------------------------------
console.log("deploying KeyRegistry...");
const registry = await viem.deployContract("KeyRegistry");
console.log(`  KeyRegistry    ${registry.address}`);

console.log("deploying MessageAnchor...");
const anchor = await viem.deployContract("MessageAnchor");
console.log(`  MessageAnchor  ${anchor.address}\n`);

// ---- prove it works --------------------------------------------------------
// A representative RSA-2048 SPKI payload, the same shape the browser will register.
const samplePublicKey = toHex(new Uint8Array(294).fill(0x2a));
console.log("registering a public key on chain...");
const registerTx = await registry.write.registerKey([samplePublicKey]);
await publicClient.waitForTransactionReceipt({ hash: registerTx });
const [storedKey, , version] = await registry.read.keyOf([deployer]);
console.log(`  tx        ${registerTx}`);
console.log(`  readback  version=${version} matches=${storedKey === samplePublicKey}\n`);

const ciphertext = `xmail-proof-${Date.now()}`;
const messageHash = keccak256(
  encodePacked(["string", "address", "address"], [ciphertext, deployer, deployer])
);
console.log("anchoring a message commitment...");
const anchorTx = await anchor.write.anchor([messageHash, deployer]);
const anchorReceipt = await publicClient.waitForTransactionReceipt({ hash: anchorTx });
const [verified, timestamp, blockNumber] = await anchor.read.verify([
  messageHash,
  deployer,
  deployer,
]);
console.log(`  tx        ${anchorTx}`);
console.log(`  hash      ${messageHash}`);
console.log(`  verified  ${verified} (block ${blockNumber}, ts ${timestamp})\n`);

// ---- record ----------------------------------------------------------------
const record = {
  network: networkName,
  chainId,
  deployedAt: new Date().toISOString(),
  deployer,
  contracts: {
    KeyRegistry: registry.address,
    MessageAnchor: anchor.address,
  },
  proof: {
    registerKeyTx: registerTx,
    anchorTx,
    anchoredMessageHash: messageHash,
    anchoredPlaintextPreimage: ciphertext,
    verifiedOnChain: verified,
    blockNumber: Number(blockNumber),
  },
  explorer: explorer
    ? {
        keyRegistry: `${explorer}/address/${registry.address}`,
        messageAnchor: `${explorer}/address/${anchor.address}`,
        registerKeyTx: `${explorer}/tx/${registerTx}`,
        anchorTx: `${explorer}/tx/${anchorTx}`,
      }
    : null,
};

const out = fileURLToPath(new URL(`../deployments/${networkName}.json`, import.meta.url));
writeFileSync(out, JSON.stringify(record, null, 2) + "\n");

console.log("=".repeat(64));
console.log("PROOF IT IS ACTUALLY ON-CHAIN");
console.log("=".repeat(64));
if (explorer) {
  console.log(`KeyRegistry    ${explorer}/address/${registry.address}`);
  console.log(`MessageAnchor  ${explorer}/address/${anchor.address}`);
  console.log(`registerKey tx ${explorer}/tx/${registerTx}`);
  console.log(`anchor tx      ${explorer}/tx/${anchorTx}`);
}
console.log(`\ngas used (anchor): ${anchorReceipt.gasUsed}`);
console.log(`saved -> deployments/${networkName}.json\n`);
