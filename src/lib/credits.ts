/**
 * What a message costs.
 *
 * Charged on stored ciphertext bytes, not plaintext characters, for one
 * unavoidable reason: the server can never read the plaintext, so a
 * client-supplied character count would be a number the payer controls. Bytes
 * on disk are the only quantity both sides can agree on.
 *
 * This module is the *estimate* shown in the composer. `send_email_debit` in
 * Postgres recomputes the same rule from the row it is about to write, and that
 * result is authoritative. If the two ever disagree, the server wins and the UI
 * is the thing that is wrong.
 */

/** Bytes of ciphertext included per credit beyond the first. */
export const BYTES_PER_CREDIT = 4000;

export function creditCost(
  ciphertextBytes: number,
  attachmentCount = 0,
): number {
  return 1 + Math.floor(ciphertextBytes / BYTES_PER_CREDIT) + attachmentCount;
}

/** Byte length of the fields that actually get stored. */
export function ciphertextBytes(...parts: (string | null | undefined)[]): number {
  return parts.reduce<number>((n, p) => n + (p ? p.length : 0), 0);
}

export function describeCost(cost: number): string {
  return cost === 1 ? "1 credit" : `${cost} credits`;
}
