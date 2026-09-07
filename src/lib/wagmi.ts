import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { ACTIVE_CHAIN } from "@/config/chain";

/**
 * Wallet configuration.
 *
 * xmail moved from Solana to EVM because the chain the product's guarantees
 * live on is EVM. With a Solana wallet the user could not sign anything on it,
 * so xmail had to relay every anchor on their behalf -- which meant that for
 * the one thing the site says you need not trust us about, you had to.
 *
 * `injected()` covers MetaMask, Rabby, Brave, Frame and anything else that
 * follows EIP-6963, which is the majority of what people actually have.
 */
export const robinhoodChain = defineChain({
  id: ACTIVE_CHAIN.id,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ACTIVE_CHAIN.rpcUrl] } },
  blockExplorers: {
    default: { name: "Blockscout", url: ACTIVE_CHAIN.explorerUrl },
  },
  testnet: ACTIVE_CHAIN.testnet,
});

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "xmail", appLogoUrl: "/logo-192.png" }),
  ],
  transports: {
    [robinhoodChain.id]: http(ACTIVE_CHAIN.rpcUrl),
  },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
