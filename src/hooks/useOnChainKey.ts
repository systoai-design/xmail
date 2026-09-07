import { useCallback, useEffect, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { robinhoodChain } from "@/lib/wagmi";
import { keyRegistryAddress, KEY_REGISTRY_ABI, readRegisteredKey } from "@/lib/chainClient";
import { isDeployed } from "@/config/chain";

/**
 * Publishing your public key to the chain.
 *
 * The database already holds everyone's public key, and that is what messages
 * are encrypted to. The registry is not a faster copy of it -- it is the thing
 * that makes the database checkable. If we ever served a different key for a
 * recipient, the on-chain record would not match, and the sender's own browser
 * would catch it before encrypting anything.
 *
 * That is the whole point, and it is why the site can say the chain holds the
 * recipient's key. Until this was wired up, that sentence was not true.
 *
 * Registration is a transaction, so it costs gas and asks for a signature. It
 * is offered rather than forced: an unregistered key still works, it simply
 * cannot be independently verified.
 */

/** Base64 SPKI -> 0x bytes, which is what the contract stores. */
function base64ToHex(b64: string): `0x${string}` {
  const bin = atob(b64);
  let hex = "";
  for (let i = 0; i < bin.length; i++) {
    hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return `0x${hex}`;
}

export function useOnChainKey() {
  const { address, ensureChain } = useWallet();
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [registered, setRegistered] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<boolean | null>(null);
  const [publishing, setPublishing] = useState(false);

  const localKey = () => localStorage.getItem("encryption_public_key");

  const refresh = useCallback(async () => {
    if (!address || !isDeployed) return;
    try {
      const onChain = await readRegisteredKey(address as `0x${string}`);
      const has = onChain.version > 0 && onChain.publicKey !== "0x";
      setRegistered(has);

      // A published key that disagrees with the local one is the case worth
      // catching: it means this browser is holding a key the chain does not
      // vouch for.
      const local = localKey();
      setMatches(has && local ? onChain.publicKey.toLowerCase() === base64ToHex(local).toLowerCase() : null);
    } catch (err) {
      console.error("Could not read the on-chain key:", err);
      setRegistered(null);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publish = useCallback(async () => {
    const local = localKey();
    if (!address || !local) {
      toast({ title: "No key to publish yet", variant: "destructive" });
      return false;
    }
    setPublishing(true);
    try {
      // Throws if the wallet is not on Robinhood Chain. Nothing below this line
      // can run on the wrong network.
      await ensureChain();
      const hash = await writeContractAsync({
        address: keyRegistryAddress,
        abi: KEY_REGISTRY_ABI,
        functionName: "registerKey",
        args: [base64ToHex(local)],
        chain: robinhoodChain,
        account: address as `0x${string}`,
      });
      await publicClient?.waitForTransactionReceipt({ hash, timeout: 90_000 });
      await refresh();
      toast({
        title: "Key published on-chain",
        description: "Anyone can now check that the key they encrypt to is really yours.",
      });
      return true;
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "";
      toast({
        title: /rejected|denied/i.test(message) ? "Cancelled" : "Could not publish the key",
        description: /rejected|denied/i.test(message) ? undefined : "Your mail still works; it just is not independently verifiable yet.",
        variant: "destructive",
      });
      return false;
    } finally {
      setPublishing(false);
    }
  }, [address, ensureChain, writeContractAsync, publicClient, refresh, toast]);

  return { registered, matches, publishing, publish, refresh };
}

/**
 * Checks a RECIPIENT's key against the chain before encrypting to it.
 *
 * Returns 'match' when the chain confirms the key, 'unregistered' when they
 * have not published one, and 'mismatch' when the chain says something else --
 * which is the impersonation case, and the only one worth blocking a send for.
 */
export async function verifyRecipientKey(
  recipient: string,
  databaseKeyBase64: string,
): Promise<"match" | "unregistered" | "mismatch" | "unavailable"> {
  if (!isDeployed) return "unavailable";
  try {
    const onChain = await readRegisteredKey(recipient as `0x${string}`);
    if (onChain.version === 0 || onChain.publicKey === "0x") return "unregistered";
    return onChain.publicKey.toLowerCase() === base64ToHex(databaseKeyBase64).toLowerCase()
      ? "match"
      : "mismatch";
  } catch {
    // The chain being unreachable must not block mail. Unverified is a weaker
    // guarantee than verified, but it is not a reason to refuse to send.
    return "unavailable";
  }
}
