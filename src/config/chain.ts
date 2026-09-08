/**
 * Robinhood Chain configuration.
 *
 * `isDeployed` gates every on-chain claim in the UI. Until the contracts are
 * actually deployed and their addresses land here, the site cannot render a
 * "verified on-chain" badge, because there is nothing to verify. The old build
 * advertised blockchain guarantees it never implemented; making that state
 * unrepresentable is cheaper than remembering not to lie.
 *
 * Populated from contracts/deployments/<network>.json after `npm run deploy:testnet`.
 */

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet: boolean;
}

export const ROBINHOOD_TESTNET: ChainConfig = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  shortName: "Robinhood Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
};

export const ROBINHOOD_MAINNET: ChainConfig = {
  id: 4663,
  name: "Robinhood Chain",
  shortName: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: false,
};

export const ACTIVE_CHAIN: ChainConfig = ROBINHOOD_TESTNET;

/** Deployed contract addresses. Empty string means "not deployed yet". */
export const CONTRACTS = {
  keyRegistry: (import.meta.env.VITE_KEY_REGISTRY_ADDRESS ?? "") as string,
  messageAnchor: (import.meta.env.VITE_MESSAGE_ANCHOR_ADDRESS ?? "") as string,
};

/**
 * The wallet that submitted anchor transactions before senders signed for
 * themselves.
 *
 * Kept only so that verification still resolves for mail anchored under the old
 * Solana-era arrangement, where users held wallets that could not sign on an EVM
 * chain and xmail relayed on their behalf -- making `msg.sender` this address
 * rather than the sender's. Everything sent since is signed by the sender, so
 * verification tries the sender first and only falls back to this.
 *
 * Nothing writes anchors from this key any more. Do not reintroduce one.
 */
export const ANCHOR_RELAYER = (import.meta.env.VITE_ANCHOR_RELAYER ??
  "0xd5959d80fd9defa138c63745864c75bc4f3e5b71") as string;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * True only when both contracts have real addresses. Every on-chain claim in
 * the UI must be gated on this.
 */
export const isDeployed =
  ADDRESS_RE.test(CONTRACTS.keyRegistry) && ADDRESS_RE.test(CONTRACTS.messageAnchor);

/**
 * The commitment written by the deploy script, kept here so the site can show a
 * verification that genuinely resolves against the chain rather than a mock.
 * Regenerate by re-running `npm run deploy:testnet` in contracts/.
 */
export const REFERENCE_PROOF = {
  preimage: "xmail-proof-1788734968513",
  participant: "0xd5959d80fd9defa138c63745864c75bc4f3e5b71" as `0x${string}`,
  messageHash: "0x55380e753112b20e1613cb749b9db3af6535e6adb7ab35c0ad0097eeb1edab0c" as `0x${string}`,
  txHash: "0xd8ae3c75e3243b45cd6130c14608aa448d33a86dd5aa214f2f7e93606b0f6b7d",
  /**
   * The L2 block, taken from the transaction receipt -- NOT the block the
   * contract stores.
   *
   * Robinhood Chain is an Arbitrum Orbit (Nitro) L2, where `block.number`
   * inside the EVM reports the parent chain's height, not the L2's. So
   * MessageAnchor recorded 11650229 for this anchor while the transaction
   * itself is in L2 block 114426835. Both are correct; only one of them is the
   * number the explorer shows, and this section links straight to the explorer.
   * Quoting the other one hands a visitor two different numbers for one message
   * on the page that tells them to go and check for themselves.
   */
  blockNumber: 114426835,
};

export const explorerTx = (hash: string) => `${ACTIVE_CHAIN.explorerUrl}/tx/${hash}`;
export const explorerAddress = (address: string) =>
  `${ACTIVE_CHAIN.explorerUrl}/address/${address}`;
