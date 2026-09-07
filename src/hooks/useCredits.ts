import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { callSecureEndpoint } from "@/lib/secureApi";
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";

export interface LedgerEntry {
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

/**
 * The credit balance.
 *
 * Read-only on the client by design: the balance lives behind RLS with no
 * policies, so the anon key cannot see or move it. Everything comes through the
 * edge function on the service role, and the only thing that ever decrements it
 * is the same transaction that inserts the message.
 *
 * `refresh` is exposed rather than polled. A balance only changes when this user
 * sends something, and the send response already carries the new value.
 */
export function useCredits() {
  const { publicKey, signMessage } = useWallet();
  const { keysReady } = useEncryptionKeys();
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    setLoading(true);
    try {
      const res = await callSecureEndpoint("get_credits", {}, publicKey, signMessage);
      setBalance(typeof res.balance === "number" ? res.balance : null);
      setLedger(res.ledger ?? []);
    } catch (err) {
      console.error("Could not read credit balance:", err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage]);

  useEffect(() => {
    // Once per wallet per mount. `refresh` depends on wallet objects whose
    // identity is not guaranteed stable across renders, so without this guard
    // the effect can re-fire indefinitely.
    if (!keysReady || !publicKey) return;
    const key = publicKey.toBase58();
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    void refresh();
  }, [keysReady, publicKey, refresh]);

  /** Applied straight from a send response, so the sidebar updates instantly. */
  const setFromSend = useCallback((next: number | undefined) => {
    if (typeof next === "number") setBalance(next);
  }, []);

  return { balance, ledger, loading, refresh, setFromSend };
}
