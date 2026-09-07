# xmail contracts — Robinhood Chain

Two contracts, deliberately small.

**`KeyRegistry.sol`** binds an RSA-OAEP public key (SPKI DER, as WebCrypto exports it)
to the address that registered it. There is no owner, no admin, no privileged writer:
`msg.sender` is the only key that can write `_keys[msg.sender]`.

This is the repair for a real vulnerability. In the Supabase version the RLS policy on
`encryption_keys` was `FOR UPDATE USING (true) WITH CHECK (true)` with anonymous access,
so anyone could overwrite anyone's public key and silently receive their future mail.
A database ACL can only *forbid* that. The chain makes it unrepresentable.

**`MessageAnchor.sol`** stores `keccak256(ciphertext ‖ from ‖ to)` per message. Ciphertext
never touches the chain — an anchor proves a specific message existed, unaltered, between
two addresses, no later than its block. Nothing about its contents.

## Networks

| | chain ID | RPC | explorer |
|---|---|---|---|
| testnet | 46630 | `https://rpc.testnet.chain.robinhood.com` | `explorer.testnet.chain.robinhood.com` |
| mainnet | 4663 | `https://rpc.mainnet.chain.robinhood.com` | `robinhoodchain.blockscout.com` |

Robinhood Chain is an Arbitrum Orbit (Nitro) L2 settling to Ethereum. Native gas is ETH.

## Deploy

```bash
npm install
npm test                  # 13 tests, incl. the key-substitution proof
npm run wallet:new        # generates a TESTNET-ONLY deployer into .env
```

Then fund the printed address at https://faucet.testnet.chain.robinhood.com.
**A human has to do this step** — the faucet requires Cloudflare verification and a
connected Google account. It drips 0.01 ETH per address per 24h, which is ~8,700 anchors.

```bash
npm run deploy:testnet
```

The deploy script does not just deploy. It registers a key, anchors a message, reads both
back through `verify()`, and prints explorer links — so a successful run *is* the proof.
Results land in `deployments/robinhoodTestnet.json`.

## Costs (0.01 gwei, ETH at $3.5k)

| operation | gas | ~USD |
|---|---|---|
| `anchor` | 113,960 | $0.004 |
| `registerKey` | ~250,000 | $0.009 |
| deploy both | ~3,000,000 | $0.105 |

## Security notes

- `DEPLOYER_PRIVATE_KEY` sits in plaintext in `.env` (gitignored). Testnet only. Never fund
  it on mainnet; generate a fresh key held in a proper signer for any mainnet deploy.
- `KeyRegistry` stores keys in contract storage rather than events only, so a client can
  resolve a recipient with a single `eth_call` and needs no indexer to send mail.
- Rotation is permitted and version-tracked. Clients should surface a version change in the
  UI, because a rotation between composing and sending is indistinguishable from an attack
  the recipient performed on themselves.
