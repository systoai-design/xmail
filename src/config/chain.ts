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
 * The wallet that submits anchor transactions.
 *
 * Users sign in with Solana wallets and the anchor contract is EVM, so they
 * cannot sign the transaction themselves -- xmail relays it. The contract
 * records `from` as `msg.sender`, which is therefore THIS address, not the
 * sender's. Verification must ask for it accordingly: calling verify() with the
 * sender's own derived address returns false for every message, which is
 * exactly the bug this constant exists to prevent.
 *
 * The binding to the real sender is not lost -- it lives inside the hash, whose
 * preimage includes the sender's derived address. Recomputing the commitment is
 * what proves who sent it; the chain proves when, and that it has not changed.
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
  blockNumber: 11650229,
};

export const explorerTx = (hash: string) => `${ACTIVE_CHAIN.explorerUrl}/tx/${hash}`;
export const explorerAddress = (address: string) =>
  `${ACTIVE_CHAIN.explorerUrl}/address/${address}`;
