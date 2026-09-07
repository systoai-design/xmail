/**
 * The five layers that actually protect an xmail message.
 *
 * This is not marketing abstraction -- each entry maps to a real mechanism in
 * the codebase, so the 3D scene and the copy stay honest as the product changes:
 *
 *   aes      -> src/lib/encryption.ts        (AES-256-GCM content encryption)
 *   rsa      -> src/lib/encryption.ts        (RSA-OAEP 2048 key wrapping)
 *   wallet   -> src/lib/walletKeyDerivation.ts (private key sealed to the wallet)
 *   registry -> contracts/KeyRegistry.sol    (public key authenticated on-chain)
 *   anchor   -> contracts/MessageAnchor.sol  (keccak256 commitment on-chain)
 */

export type LayerId = "message" | "aes" | "rsa" | "wallet" | "registry" | "anchor";

export interface EncryptionLayer {
  id: LayerId;
  index: number;
  label: string;
  spec: string;
  headline: string;
  body: string;
  /** Where this layer lives. On-chain layers are the ones a third party can verify. */
  domain: "device" | "chain";
  /** Radius of the shell in the 3D scene. */
  radius: number;
  /** HSL triplet, kept in sync with the design tokens. */
  hue: number;
}

export const LAYERS: EncryptionLayer[] = [
  {
    id: "message",
    index: 0,
    label: "Your message",
    spec: "plaintext",
    headline: "The only place your message is ever readable",
    body: "Plaintext exists on your device and the recipient's, and nowhere in between. It is never sent to a server in a form anyone else could read.",
    domain: "device",
    radius: 0.52,
    hue: 38,
  },
  {
    id: "aes",
    index: 1,
    label: "Content encryption",
    spec: "AES-256-GCM",
    headline: "Sealed with a key that exists for one message",
    body: "The body and attachments are encrypted in your browser with a fresh 256-bit key. GCM is authenticated, so any tampering with the ciphertext is detected on decryption rather than silently accepted.",
    domain: "device",
    radius: 0.80,
    hue: 252,
  },
  {
    id: "rsa",
    index: 2,
    label: "Key wrapping",
    spec: "RSA-OAEP 2048",
    headline: "That key is locked to the recipient alone",
    body: "The one-time AES key is wrapped with the recipient's public key. Only their private key can unwrap it, so xmail can carry the message without ever being able to open it.",
    domain: "device",
    radius: 1.06,
    hue: 258,
  },
  {
    id: "wallet",
    index: 3,
    label: "Private key custody",
    spec: "wallet-derived",
    headline: "Your private key is sealed by your wallet",
    body: "The private key is encrypted with a key derived from a signature only your wallet can produce. There is no password to lose and no server-side copy to steal.",
    domain: "device",
    radius: 1.32,
    hue: 264,
  },
  {
    id: "registry",
    index: 4,
    label: "Key registry",
    spec: "on-chain",
    headline: "Nobody can swap the recipient's key for their own",
    body: "Public keys live in a contract where the address owner is the only account that can write its own entry. Key substitution is not forbidden by a permission check -- it has no valid transaction.",
    domain: "chain",
    radius: 1.58,
    hue: 196,
  },
  {
    id: "anchor",
    index: 5,
    label: "Integrity anchor",
    spec: "on-chain",
    headline: "Proof the message was not altered",
    body: "A keccak256 commitment over the ciphertext is written on-chain. Recompute it and compare: the message you read is byte-identical to the one that was sent, and it existed no later than its block.",
    domain: "chain",
    radius: 1.84,
    hue: 186,
  },
];

export const DEVICE_LAYERS = LAYERS.filter((l) => l.domain === "device");
export const CHAIN_LAYERS = LAYERS.filter((l) => l.domain === "chain");
