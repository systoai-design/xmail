import { useCallback } from "react";
import {
  useAccount,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { robinhoodChain } from "@/lib/wagmi";

/**
 * The wallet, as the rest of the app wants to see it.
 *
 * One adapter rather than wagmi hooks scattered across sixteen components, so
 * the next wallet change touches one file instead of sixteen.
 *
 * `address` is always LOWERCASE. EVM addresses are case-insensitive but wallets
 * hand back a checksummed mixed-case form, and every lookup in this app is a
 * string comparison against a database column. One checksummed write and one
 * lowercase read is a mailbox that silently has no mail in it, so the
 * normalisation happens once, here, at the boundary.
 */
export function useWallet() {
  const { address: raw, isConnected, isConnecting, isReconnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const chainId = useChainId();

  const address = raw ? raw.toLowerCase() : null;
  const wrongChain = isConnected && chainId !== robinhoodChain.id;

  /**
   * Signs a UTF-8 string via EIP-191 personal_sign and returns a 0x signature.
   * Replaces the Solana adapter's Uint8Array in / Uint8Array out.
   */
  const signMessage = useCallback(
    async (message: string) => {
      if (!raw) throw new Error("Connect a wallet first.");
      return signMessageAsync({ account: raw, message });
    },
    [signMessageAsync, raw],
  );

  /** Prompts the wallet to add or switch to Robinhood Chain. */
  const switchToChain = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: robinhoodChain.id });
      return true;
    } catch {
      return false;
    }
  }, [switchChainAsync]);

  return {
    address,
    connected: isConnected && !!address,
    connecting: isConnecting || isReconnecting,
    wrongChain,
    chainId,
    signMessage,
    switchToChain,
    disconnect,
  };
}
