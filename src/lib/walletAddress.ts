import bs58 from "bs58";
import { keccak256 } from "viem";
import type { Address } from "viem";

/**
 * Solana wallet -> EVM address.
 *
 * The MessageAnchor contract types its participants as `address`, which is 20
 * bytes, while a Solana public key is 32. They cannot be the same value, so the
 * anchor records a *derived* identity: the last 20 bytes of keccak256 over the
 * raw public key bytes.
 *
 * The derivation is deliberately plain and one-way-but-reproducible. Anyone
 * holding the base58 address can recompute this and check the anchor themselves,
 * which is the only property that matters -- an anchor nobody else can verify
 * proves nothing.
 *
 * This exact function is duplicated inside the secure-email edge function,
 * because the two run on different platforms and the anchor is worthless if the
 * two derivations ever diverge. Change one, change both.
 */
export function walletToEvmAddress(base58Address: string): Address {
  const bytes = bs58.decode(base58Address);
  return `0x${keccak256(bytes).slice(-40)}` as Address;
}
