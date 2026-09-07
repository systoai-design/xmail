/**
 * Read-only client for Robinhood Chain.
 *
 * Deliberately read-only and wallet-free: the verification UI must work for a
 * visitor who has never connected anything. Proof that anyone can check without
 * trusting us is the entire point -- gating it behind a wallet would defeat it.
 */
import { createPublicClient, http, defineChain, keccak256, encodePacked, type Address } from "viem";
import { ACTIVE_CHAIN, CONTRACTS, ANCHOR_RELAYER } from "@/config/chain";

export const robinhoodChain = defineChain({
  id: ACTIVE_CHAIN.id,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  rpcUrls: { default: { http: [ACTIVE_CHAIN.rpcUrl] } },
  blockExplorers: { default: { name: "Explorer", url: ACTIVE_CHAIN.explorerUrl } },
  testnet: ACTIVE_CHAIN.testnet,
});

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(ACTIVE_CHAIN.rpcUrl, { batch: true, retryCount: 2 }),
});

export const MESSAGE_ANCHOR_ABI = [
  // Write. The sender signs this themselves, so the contract records THEM as
  // msg.sender -- which is what turns "this message has not changed" into
  // "this sender sent this message".
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "messageHash", type: "bytes32" },
      { name: "to", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "verify",
    stateMutability: "view",
    inputs: [
      { name: "messageHash", type: "bytes32" },
      { name: "expectedFrom", type: "address" },
      { name: "expectedTo", type: "address" },
    ],
    outputs: [
      { name: "verified", type: "bool" },
      { name: "timestamp", type: "uint64" },
      { name: "blockNumber", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "anchorOf",
    stateMutability: "view",
    inputs: [{ name: "messageHash", type: "bytes32" }],
    outputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "timestamp", type: "uint64" },
      { name: "blockNumber", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "isAnchored",
    stateMutability: "view",
    inputs: [{ name: "messageHash", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "totalAnchored",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "sentCount",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const KEY_REGISTRY_ABI = [
  {
    type: "function",
    name: "keyOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      { name: "publicKey", type: "bytes" },
      { name: "updatedAt", type: "uint64" },
      { name: "version", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "hasKey",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  // Write. `msg.sender` is the only address that can write its own slot, so
  // there is no owner to trust and key substitution is unrepresentable rather
  // than merely forbidden.
  {
    type: "function",
    name: "registerKey",
    stateMutability: "nonpayable",
    inputs: [{ name: "publicKey", type: "bytes" }],
    outputs: [],
  },
] as const;

/**
 * The commitment scheme. Must stay byte-identical to what the sender computed,
 * or verification silently fails -- so this is the single definition both the
 * send path and the verify path import.
 */
export function messageCommitment(ciphertext: string, from: Address, to: Address) {
  return keccak256(encodePacked(["string", "address", "address"], [ciphertext, from, to]));
}

export const messageAnchorAddress = CONTRACTS.messageAnchor as Address;
export const keyRegistryAddress = CONTRACTS.keyRegistry as Address;

/**
 * viem 2.56 types `authorizationList` as required on readContract params even
 * though it is optional at runtime (EIP-7702 field). Passing it explicitly keeps
 * these call sites honest rather than sprinkling `as any` through the UI.
 */
const readOpts = { authorizationList: undefined } as const;

export async function verifyAnchor(messageHash: `0x${string}`, from: Address, to: Address) {
  const [verified, timestamp, blockNumber] = (await publicClient.readContract({
    ...readOpts,
    address: messageAnchorAddress,
    abi: MESSAGE_ANCHOR_ABI,
    functionName: "verify",
    args: [messageHash, from, to],
  })) as [boolean, bigint, bigint];
  return { verified, timestamp, blockNumber };
}

/**
 * Verification for a relayed anchor.
 *
 * `expectedFrom` is the relayer, because the contract stores msg.sender and
 * xmail submits the transaction on the user's behalf. Passing the sender's own
 * address here returns false for every message ever anchored.
 */
export async function verifyRelayedAnchor(messageHash: `0x${string}`, to: Address) {
  return verifyAnchor(messageHash, ANCHOR_RELAYER as Address, to);
}

export async function readTotalAnchored() {
  return (await publicClient.readContract({
    ...readOpts,
    address: messageAnchorAddress,
    abi: MESSAGE_ANCHOR_ABI,
    functionName: "totalAnchored",
  })) as bigint;
}

/** Reads a recipient's public key from the chain rather than the database. */
export async function readRegisteredKey(owner: Address) {
  const [publicKey, updatedAt, version] = (await publicClient.readContract({
    ...readOpts,
    address: keyRegistryAddress,
    abi: KEY_REGISTRY_ABI,
    functionName: "keyOf",
    args: [owner],
  })) as [`0x${string}`, bigint, number];
  return { publicKey, updatedAt, version };
}
