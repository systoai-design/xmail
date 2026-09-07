import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { useWallet } from "@/hooks/useWallet";

/**
 * Wallet provider.
 *
 * Was the Solana adapter stack. xmail's guarantees live on an EVM chain, and a
 * Solana wallet cannot sign anything there -- so every anchor had to be relayed
 * by xmail, and the product's central claim ("check the chain yourself") quietly
 * depended on trusting us. One wallet on the same chain as the contracts
 * removes that.
 *
 * wagmi keeps its own query cache, so it needs a QueryClient. This is a second
 * one alongside the app's; they are independent by design and sharing would
 * couple wallet state to application data fetching.
 */
const walletQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export const WalletContextProvider = ({ children }: { children: ReactNode }) => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={walletQueryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
);

/**
 * Kept so existing call sites need no change. `walletAddress` is lowercase,
 * which is what every database column holds.
 */
export const useWalletContext = () => {
  const { address, connected } = useWallet();
  return { connected, walletAddress: address };
};
