import { useCallback } from "react";
import { useAccount, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
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
  // `useAccount().chainId` is the chain the WALLET is on. `useChainId()` is the
  // chain the *config* is on, which for a single-chain config is always
  // Robinhood -- so it reported the right answer no matter what MetaMask was
  // actually connected to. That made the wrong-chain check permanently false,
  // the switch never fired, and transactions went out on Ethereum mainnet with
  // real gas. Never use useChainId() to decide whether it is safe to send.
  const {
    address: raw,
    isConnected,
    isConnecting,
    isReconnecting,
    chainId,
  } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();

  const address = raw ? raw.toLowerCase() : null;
  const wrongChain = isConnected && chainId !== robinhoodChain.id;

  /** EIP-191 personal_sign. Costs nothing and is chain-independent. */
  const signMessage = useCallback(
    async (message: string) => {
      if (!raw) throw new Error("Connect a wallet first.");
      return signMessageAsync({ account: raw, message });
    },
    [signMessageAsync, raw],
  );

  /**
   * Guarantees the wallet is on Robinhood Chain, or throws.
   *
   * Every transaction must go through this. Returning a boolean invited call
   * sites to carry on when it was false, which is precisely how a transaction
   * ends up signed on mainnet.
   */
  const ensureChain = useCallback(async () => {
    if (!isConnected) throw new Error("Connect a wallet first.");
    if (chainId === robinhoodChain.id) return;

    try {
      await switchChainAsync({ chainId: robinhoodChain.id });
    } catch (err) {
      throw new Error(
        `This has to run on ${robinhoodChain.name}. Switch networks in your wallet and try again.`,
      );
    }

    // switchChainAsync resolving is not proof the wallet moved -- some wallets
    // resolve optimistically. Re-read before letting a transaction through.
    if (chainId !== robinhoodChain.id) {
      // The hook value is a render behind, so confirm against the provider.
      const current = await (window as any).ethereum?.request?.({ method: "eth_chainId" });
      if (current && parseInt(current, 16) !== robinhoodChain.id) {
        throw new Error(
          `Your wallet is still on another network. Switch to ${robinhoodChain.name} and try again.`,
        );
      }
    }
  }, [isConnected, chainId, switchChainAsync]);

  const switchToChain = useCallback(async () => {
    try {
      await ensureChain();
      return true;
    } catch {
      return false;
    }
  }, [ensureChain]);

  return {
    address,
    connected: isConnected && !!address,
    connecting: isConnecting || isReconnecting,
    wrongChain,
    chainId,
    signMessage,
    ensureChain,
    switchToChain,
    disconnect,
  };
}
