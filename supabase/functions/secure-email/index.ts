import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as djwt from 'https://deno.land/x/djwt@v3.0.1/mod.ts';
import {
  createWalletClient, createPublicClient, http, defineChain,
  keccak256, encodePacked, verifyMessage, isAddress, parseEventLogs,
} from 'https://esm.sh/viem@2.21.54';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.21.54/accounts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This secret is the only thing standing between a stranger and every inbox:
// session tokens gate get_inbox / get_email / get_sent, so anyone who knows it
// can mint a token for any wallet and read that wallet's mail. It was a literal
// string in committed source. Refusing to boot without the env var is the point
// -- a fallback default would silently reintroduce the same hole.
const JWT_SECRET = Deno.env.get('SESSION_JWT_SECRET');
if (!JWT_SECRET) {
  throw new Error('SESSION_JWT_SECRET is not set; refusing to issue forgeable sessions.');
}
const SESSION_DURATION = 3600; // 1 hour in seconds

/** Mirrors src/lib/credits.ts. This side is authoritative. */
const BYTES_PER_CREDIT = 4000;

// ---- on-chain anchoring ---------------------------------------------------
//
// Users hold Solana wallets and the anchor contract lives on an EVM chain, so
// they cannot sign the transaction themselves. xmail submits it with its own
// key. Be precise about what that does and does not prove: the hash on chain is
// immutable and publicly checkable, so nobody -- including xmail -- can alter a
// message after the fact without the hash ceasing to match. It is NOT proof the
// sender authorised the anchor; that would need the sender's own EVM signature,
// which is the wallet migration.
//
// Anchoring is best-effort and deliberately non-fatal. A message that sends but
// fails to anchor is a message with no integrity proof; a message that fails to
// send because the chain was busy is lost mail. The first is strictly better.
// Read per call, not at module load. A function instance that booted before the
// secret existed would otherwise cache `undefined` for its whole lifetime and
// skip anchoring silently, even after the secret was set.
const anchorKey = () => Deno.env.get('ANCHOR_PRIVATE_KEY');
const CREDIT_SALE_ADDRESS = Deno.env.get('CREDIT_SALE_ADDRESS');

// ---- credit packages ------------------------------------------------------
// One package, matching the Pro tier on the pricing page. Priced in USD and
// converted at purchase time: the buyer pays in ETH but thinks in dollars.
const PACKAGE_USD_CENTS = 1900;
const PACKAGE_CREDITS = 500;

/**
 * ETH price, read server-side at both quote and claim time.
 *
 * Never taken from the client, for the obvious reason that the client is the
 * party paying. The claim re-reads the price and compares against the amount
 * actually sent, so a stale or manipulated quote cannot buy credits cheaply --
 * it can only fail.
 */
async function ethUsdPrice(): Promise<number> {
  const sources = [
    { url: 'https://api.coinbase.com/v2/prices/ETH-USD/spot', pick: (j: any) => Number(j?.data?.amount) },
    { url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', pick: (j: any) => Number(j?.ethereum?.usd) },
  ];
  for (const src of sources) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const price = src.pick(await res.json());
      if (Number.isFinite(price) && price > 0) return price;
    } catch {
      /* try the next source */
    }
  }
  throw new Error('Could not read an ETH price just now. Try again in a moment.');
}

/** USD cents -> wei at a given ETH/USD price. */
function centsToWei(cents: number, ethUsd: number): bigint {
  return BigInt(Math.ceil((cents / 100 / ethUsd) * 1e18));
}

/** The mailbox a payment is for, as the contract records it. */
function accountHashFor(wallet: string): `0x${string}` {
  return keccak256(new TextEncoder().encode(wallet.toLowerCase()));
}

const ANCHORED_EVENT_ABI = [
  {
    type: 'event',
    name: 'Anchored',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'messageHash', type: 'bytes32', indexed: true },
      { name: 'timestamp', type: 'uint64', indexed: false },
      { name: 'blockNumber', type: 'uint64', indexed: false },
    ],
  },
] as const;

const CREDIT_SALE_ABI = [
  {
    type: 'event',
    name: 'CreditsPurchased',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'accountHash', type: 'bytes32', indexed: true },
      { name: 'amountWei', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
] as const;

/** Admin wallets get free credits, for testing against the live system. */
async function isAdminWallet(admin: any, wallet: string): Promise<boolean> {
  const { data } = await admin
    .from('user_roles')
    .select('role')
    .eq('wallet_address', wallet.toLowerCase())
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}
const MESSAGE_ANCHOR_ADDRESS = Deno.env.get('MESSAGE_ANCHOR_ADDRESS');
const RPC_URL = Deno.env.get('CHAIN_RPC_URL') ?? 'https://rpc.testnet.chain.robinhood.com';
const CHAIN_ID = Number(Deno.env.get('CHAIN_ID') ?? 46630);

const robinhood = defineChain({
  id: CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const ANCHOR_ABI = [
  {
    type: 'function',
    name: 'anchor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'messageHash', type: 'bytes32' },
      { name: 'to', type: 'address' },
    ],
    outputs: [],
  },
] as const;

/** Must stay byte-identical to messageCommitment() in src/lib/chainClient.ts. */
function messageCommitment(ciphertext: string, from: `0x${string}`, to: `0x${string}`) {
  return keccak256(encodePacked(['string', 'address', 'address'], [ciphertext, from, to]));
}

async function anchorMessage(ciphertext: string, fromWallet: string, toWallet: string) {
  const key = anchorKey();
  if (!key || !MESSAGE_ANCHOR_ADDRESS) {
    console.log('Anchoring skipped: ANCHOR_PRIVATE_KEY or MESSAGE_ANCHOR_ADDRESS not set');
    return null;
  }
  try {
    // Wallet addresses ARE EVM addresses now. The keccak derivation that used
    // to bridge Solana addresses onto this chain is gone, and with it a whole
    // class of "the two sides derived differently" bug.
    const from = fromWallet as `0x${string}`;
    const to = toWallet as `0x${string}`;
    const messageHash = messageCommitment(ciphertext, from, to);

    const account = privateKeyToAccount(key as `0x${string}`);
    const wallet = createWalletClient({ account, chain: robinhood, transport: http(RPC_URL) });
    const publicClient = createPublicClient({ chain: robinhood, transport: http(RPC_URL) });

    const txHash = await wallet.writeContract({
      address: MESSAGE_ANCHOR_ADDRESS as `0x${string}`,
      abi: ANCHOR_ABI,
      functionName: 'anchor',
      args: [messageHash, to],
    });

    // The block number is what makes the anchor citable, so it is worth a short
    // wait -- but never an unbounded one, because the mail is already delivered.
    let blockNumber: bigint | null = null;
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 15_000 });
      blockNumber = receipt.blockNumber;
    } catch {
      console.log('Anchor submitted but receipt timed out; tx hash recorded');
    }

    console.log(`Anchored ${messageHash} in tx ${txHash}`);
    return { messageHash, txHash, blockNumber: blockNumber ? Number(blockNumber) : null };
  } catch (err) {
    console.error('Anchoring failed (message already sent):', err);
    return null;
  }
}

/** Cached: importKey on every request is pure overhead for a fixed secret. */
let signingKey: CryptoKey | null = null;
async function getSigningKey(): Promise<CryptoKey> {
  if (!signingKey) {
    signingKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return signingKey;
}

async function generateSessionToken(walletPublicKey: string): Promise<string> {
  const key = await getSigningKey();

  return await djwt.create(
    { alg: 'HS256', typ: 'JWT' },
    {
      wallet: walletPublicKey,
      exp: djwt.getNumericDate(SESSION_DURATION),
    },
    key
  );
}

async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const key = await getSigningKey();
    const payload = await djwt.verify(token, key);
    return payload.wallet as string;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data, signature, walletPublicKey, sessionToken } = await req.json();

    console.log(`Action: ${action}, Wallet: ${walletPublicKey}`);

    let verifiedWallet: string | null = null;

    // Try session token first
    if (sessionToken) {
      verifiedWallet = await verifySessionToken(sessionToken);
      if (verifiedWallet) {
        console.log('Session token verified successfully');
      }
    }

    // Fall back to signature verification if no valid session token
    if (!verifiedWallet) {
      if (!signature || !walletPublicKey) {
        throw new Error('Authentication required');
      }

      if (!isAddress(walletPublicKey)) {
        throw new Error('Invalid wallet address');
      }

      // EIP-191. verifyMessage recovers the signer and compares, so a request
      // cannot claim an address it does not hold the key for.
      const verified = await verifyMessage({
        address: walletPublicKey as `0x${string}`,
        message: JSON.stringify(data),
        signature: signature as `0x${string}`,
      });

      if (!verified) {
        console.error('Signature verification failed');
        throw new Error('Invalid signature');
      }

      // Lowercased at the boundary. Wallets send checksummed addresses and every
      // column stores lowercase; one mismatched comparison is an empty mailbox.
      verifiedWallet = walletPublicKey.toLowerCase();
      console.log('Signature verified successfully');
    }

    // Use verifiedWallet instead of walletPublicKey throughout

    // Handle different actions
    switch (action) {
      case 'authenticate': {
        // Generate session token after successful signature verification
        if (!verifiedWallet) {
          throw new Error('Authentication required');
        }
        const token = await generateSessionToken(verifiedWallet);
        console.log('Session token generated');
        return new Response(
          JSON.stringify({ sessionToken: token }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_email': {
        // Verify sender matches wallet
        if (data.from_wallet !== verifiedWallet) {
          throw new Error('Sender wallet mismatch');
        }

        // Cost is computed here, from the bytes actually about to be stored --
        // never from anything the client tells us. See src/lib/credits.ts; the
        // rule is duplicated because one side must display it and the other
        // must enforce it, and this is the side that enforces.
        const storedBytes =
          (data.encrypted_subject?.length ?? 0) +
          (data.encrypted_body?.length ?? 0) +
          (data.sender_encrypted_subject?.length ?? 0) +
          (data.sender_encrypted_body?.length ?? 0);
        const attachmentCount = Number(data.attachment_count ?? 0);
        const cost = 1 + Math.floor(storedBytes / BYTES_PER_CREDIT) + attachmentCount;

        // Debit and insert are one transaction. Two round trips would leave a
        // window where a send is charged but never stored, or the reverse.
        const { data: result, error: debitError } = await supabaseAdmin.rpc('send_email_debit', {
          p_wallet: verifiedWallet,
          p_cost: cost,
          p_to_wallet: data.to_wallet,
          p_encrypted_subject: data.encrypted_subject,
          p_encrypted_body: data.encrypted_body,
          p_sender_encrypted_subject: data.sender_encrypted_subject,
          p_sender_encrypted_body: data.sender_encrypted_body,
          p_sender_signature: data.sender_signature,
        });

        if (debitError) {
          const m = /INSUFFICIENT_CREDITS:(\d+):(\d+)/.exec(debitError.message ?? '');
          if (m) {
            return new Response(
              JSON.stringify({
                error: 'INSUFFICIENT_CREDITS',
                balance: Number(m[1]),
                required: Number(m[2]),
              }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.error('Send debit error:', debitError);
          throw debitError;
        }

        const row = Array.isArray(result) ? result[0] : result;
        console.log(`Email sent, ${cost} credit(s) charged`);

        // Anchoring is NOT done here any more. The sender signs it themselves
        // from the browser, so the contract records them rather than a shared
        // relayer -- which is what lets an anchor prove who sent a message, not
        // merely that it has not changed. Relaying as well would mean two
        // transactions racing for the same hash, and the loser reverts with
        // AlreadyAnchored. See record_anchor.

        return new Response(
          JSON.stringify({
            success: true, emailId: row?.email_id, cost, balance: row?.balance_after,
            anchor: anchored ? { txHash: anchored.txHash, block: anchored.blockNumber } : null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ---- parked mail -------------------------------------------------
      // Parking is free; the credit is charged when the message is actually
      // delivered, through the normal send path.
      case 'park_email': {
        if (data.from_wallet !== verifiedWallet) {
          throw new Error('Sender wallet mismatch');
        }
        const { data: parked, error: parkErr } = await supabaseAdmin
          .from('parked_emails')
          .insert({
            from_wallet: verifiedWallet,
            to_wallet: data.to_wallet,
            sender_encrypted_subject: data.sender_encrypted_subject,
            sender_encrypted_body: data.sender_encrypted_body,
          })
          .select()
          .single();
        if (parkErr) throw parkErr;

        return new Response(
          JSON.stringify({ success: true, parkedId: parked.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Returns only the parked messages whose recipient has since registered a
      // key, so the client has nothing to filter and no reason to learn who is
      // registered beyond the people it already wrote to.
      case 'get_deliverable_parked': {
        const { data: parked, error: pErr } = await supabaseAdmin
          .from('parked_emails')
          .select('*')
          .eq('from_wallet', verifiedWallet);
        if (pErr) throw pErr;
        if (!parked?.length) {
          return new Response(JSON.stringify({ parked: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const recipients = [...new Set(parked.map((p) => p.to_wallet))];
        const { data: keys } = await supabaseAdmin
          .from('encryption_keys')
          .select('wallet_address, public_key')
          .in('wallet_address', recipients);

        const keyed = new Map((keys ?? []).map((k) => [k.wallet_address, k.public_key]));
        const deliverable = parked
          .filter((p) => keyed.has(p.to_wallet))
          .map((p) => ({ ...p, recipient_public_key: keyed.get(p.to_wallet) }));

        await supabaseAdmin
          .from('parked_emails')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('from_wallet', verifiedWallet);

        console.log(`${deliverable.length}/${parked.length} parked messages now deliverable`);
        return new Response(
          JSON.stringify({ parked: deliverable, total: parked.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The full list, so parked mail has somewhere to be seen. Sealed to the
      // sender, so only their browser can read the subjects back.
      case 'get_parked': {
        const { data: rows, error: listErr } = await supabaseAdmin
          .from('parked_emails')
          .select('*')
          .eq('from_wallet', verifiedWallet)
          .order('created_at', { ascending: false });
        if (listErr) throw listErr;
        return new Response(
          JSON.stringify({ parked: rows || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'count_parked': {
        const { count } = await supabaseAdmin
          .from('parked_emails')
          .select('id', { count: 'exact', head: true })
          .eq('from_wallet', verifiedWallet);
        return new Response(
          JSON.stringify({ count: count ?? 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_parked': {
        const { error: delErr } = await supabaseAdmin
          .from('parked_emails')
          .delete()
          .eq('id', data.parkedId)
          .eq('from_wallet', verifiedWallet);
        if (delErr) throw delErr;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Starring lived in its own edge function that took an emailId and a
      // boolean, used the service role, and checked nothing at all -- one curl
      // with the publishable key could star or unstar anybody's mail. Here it
      // inherits the same wallet verification as everything else, and the
      // update is scoped to rows the caller is actually party to.
      case 'toggle_star': {
        const { emailId, starred } = data;
        if (!emailId || typeof starred !== 'boolean') {
          throw new Error('emailId and starred are required');
        }

        const { data: updated, error: starErr } = await supabaseAdmin
          .from('encrypted_emails')
          .update({ starred })
          .eq('id', emailId)
          .or(`from_wallet.eq.${verifiedWallet},to_wallet.eq.${verifiedWallet}`)
          .select('id, starred')
          .maybeSingle();

        if (starErr) throw starErr;
        if (!updated) {
          // Either it does not exist or it is not theirs. Same answer for both,
          // so this cannot be used to probe which emails exist.
          throw new Error('Email not found');
        }

        return new Response(
          JSON.stringify({ success: true, email: updated }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ---- buying credits ------------------------------------------------
      case 'get_credit_quote': {
        if (!CREDIT_SALE_ADDRESS) throw new Error('Credit purchases are not configured yet.');
        const price = await ethUsdPrice();
        const wei = centsToWei(PACKAGE_USD_CENTS, price);
        return new Response(
          JSON.stringify({
            contract: CREDIT_SALE_ADDRESS,
            chainId: CHAIN_ID,
            credits: PACKAGE_CREDITS,
            usdCents: PACKAGE_USD_CENTS,
            ethUsd: price,
            amountWei: wei.toString(),
            accountHash: accountHashFor(verifiedWallet),
            isAdmin: await isAdminWallet(supabaseAdmin, verifiedWallet),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verifies a payment against the chain and credits the mailbox it names.
      // Nothing here is trusted from the client beyond the transaction hash:
      // amount, recipient contract and account all come from the receipt.
      case 'claim_credit_purchase': {
        if (!CREDIT_SALE_ADDRESS) throw new Error('Credit purchases are not configured yet.');
        const txHash = String(data.txHash ?? '').trim().toLowerCase();
        if (!/^0x[0-9a-f]{64}$/.test(txHash)) throw new Error('That is not a transaction hash.');

        const publicClient = createPublicClient({ chain: robinhood, transport: http(RPC_URL) });

        let receipt;
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        } catch {
          return new Response(
            JSON.stringify({ error: 'NOT_FOUND', message: 'No such transaction on this chain yet. If you just sent it, wait a few seconds and try again.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (receipt.status !== 'success') {
          return new Response(
            JSON.stringify({ error: 'TX_FAILED', message: 'That transaction failed on-chain, so nothing was paid.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // The event is the authority, not the transaction's value field: only a
        // call to CreditSale.buy carries the account being credited.
        const logs = parseEventLogs({
          abi: CREDIT_SALE_ABI,
          logs: receipt.logs,
          eventName: 'CreditsPurchased',
        }).filter((l: any) => l.address.toLowerCase() === CREDIT_SALE_ADDRESS.toLowerCase());

        if (logs.length === 0) {
          return new Response(
            JSON.stringify({ error: 'NO_PURCHASE', message: 'That transaction did not pay the credit contract.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const expected = accountHashFor(verifiedWallet);
        const mine = logs.find((l: any) => String(l.args.accountHash).toLowerCase() === expected.toLowerCase());
        if (!mine) {
          // Paid for a different mailbox. Refusing is the entire point of
          // binding the account into the payment.
          return new Response(
            JSON.stringify({ error: 'WRONG_ACCOUNT', message: 'That payment was made for a different xmail account.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const paidWei = BigInt(mine.args.amountWei);
        const price = await ethUsdPrice();
        const requiredWei = centsToWei(PACKAGE_USD_CENTS, price);
        // 3% tolerance: ETH moves between quote and confirmation, and refusing a
        // payment that was correct when it was sent would simply be taking it.
        const minimumWei = (requiredWei * 97n) / 100n;

        if (paidWei < minimumWei) {
          return new Response(
            JSON.stringify({
              error: 'UNDERPAID',
              message: `That payment is short at the current ETH price. Sent ${(Number(paidWei) / 1e18).toFixed(6)} ETH, needed about ${(Number(requiredWei) / 1e18).toFixed(6)}.`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Proportional, so overpaying is never punished.
        const credits = Math.max(
          PACKAGE_CREDITS,
          Math.floor((Number(paidWei) / Number(requiredWei)) * PACKAGE_CREDITS),
        );

        const { data: newBalance, error: claimErr } = await supabaseAdmin.rpc('claim_credit_purchase', {
          p_tx_hash: txHash,
          p_wallet: verifiedWallet,
          p_payer: String(mine.args.payer).toLowerCase(),
          p_amount_wei: paidWei.toString(),
          p_usd_cents: PACKAGE_USD_CENTS,
          p_credits: credits,
          p_eth_usd: price,
          p_block: Number(receipt.blockNumber),
        });

        if (claimErr) {
          if ((claimErr.message ?? '').includes('ALREADY_CLAIMED')) {
            return new Response(
              JSON.stringify({ error: 'ALREADY_CLAIMED', message: 'Those credits have already been added.' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw claimErr;
        }

        console.log(`Credited ${credits} to ${verifiedWallet} for ${txHash}`);
        return new Response(
          JSON.stringify({ success: true, credits, balance: newBalance, txHash }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Free credits for admin wallets, so the live system can be tested without
      // spending real money on every run. The check is HERE, against the
      // database, on the service role -- the client's own isAdmin() decides what
      // to render and nothing more. A client-side role check is a suggestion.
      case 'grant_admin_credits': {
        if (!(await isAdminWallet(supabaseAdmin, verifiedWallet))) {
          return new Response(
            JSON.stringify({ error: 'NOT_ADMIN', message: 'This wallet is not an admin.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const amount = Math.min(Math.max(Number(data.credits ?? PACKAGE_CREDITS), 1), 10000);
        await supabaseAdmin.rpc('ensure_credit_balance', { p_wallet: verifiedWallet });

        const { data: row } = await supabaseAdmin
          .from('credit_balances')
          .select('balance')
          .eq('wallet_address', verifiedWallet)
          .single();

        const next = (row?.balance ?? 0) + amount;
        await supabaseAdmin
          .from('credit_balances')
          .update({ balance: next, updated_at: new Date().toISOString() })
          .eq('wallet_address', verifiedWallet);

        // Logged like any other movement, so a granted credit is never
        // indistinguishable from a purchased one in the ledger.
        await supabaseAdmin.from('credit_ledger').insert({
          wallet_address: verifiedWallet,
          delta: amount,
          reason: 'admin_grant',
          balance_after: next,
        });

        console.log(`Admin grant: ${amount} credits to ${verifiedWallet}`);
        return new Response(
          JSON.stringify({ success: true, credits: amount, balance: next }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The sender anchored their own message and is telling us the transaction.
      // Nothing here is taken on trust: the receipt is read from the chain, the
      // Anchored event must name this wallet as the sender, and the hash must
      // match what the stored ciphertext actually commits to. A client cannot
      // mark its own mail as anchored.
      case 'record_anchor': {
        const { emailId, txHash, messageHash } = data;
        if (!/^0x[0-9a-fA-F]{64}$/.test(String(txHash ?? ''))) {
          throw new Error('That is not a transaction hash.');
        }

        const { data: email, error: emailErr } = await supabaseAdmin
          .from('encrypted_emails')
          .select('id, from_wallet, to_wallet, encrypted_body')
          .eq('id', emailId)
          .eq('from_wallet', verifiedWallet)
          .maybeSingle();

        if (emailErr) throw emailErr;
        if (!email) throw new Error('Message not found');

        // Recompute independently. If the client sent a hash for different
        // content, this is where it stops.
        const expectedHash = messageCommitment(
          email.encrypted_body ?? '',
          email.from_wallet as `0x${string}`,
          email.to_wallet as `0x${string}`,
        );
        if (String(messageHash).toLowerCase() !== expectedHash.toLowerCase()) {
          return new Response(
            JSON.stringify({ error: 'HASH_MISMATCH', message: 'That hash does not match this message.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const publicClient = createPublicClient({ chain: robinhood, transport: http(RPC_URL) });
        let receipt;
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        } catch {
          return new Response(
            JSON.stringify({ error: 'NOT_FOUND', message: 'That transaction is not on the chain yet.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (receipt.status !== 'success') {
          return new Response(
            JSON.stringify({ error: 'TX_FAILED', message: 'That transaction failed.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const events = parseEventLogs({
          abi: ANCHORED_EVENT_ABI,
          logs: receipt.logs,
          eventName: 'Anchored',
        }).filter((l: any) => l.address.toLowerCase() === String(MESSAGE_ANCHOR_ADDRESS).toLowerCase());

        const match = events.find(
          (l: any) =>
            String(l.args.messageHash).toLowerCase() === expectedHash.toLowerCase() &&
            String(l.args.from).toLowerCase() === verifiedWallet.toLowerCase(),
        );

        if (!match) {
          return new Response(
            JSON.stringify({ error: 'NO_ANCHOR', message: 'That transaction did not anchor this message from your wallet.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseAdmin
          .from('encrypted_emails')
          .update({
            message_hash: expectedHash,
            anchor_tx_hash: String(txHash).toLowerCase(),
            anchor_block: Number(receipt.blockNumber),
            anchored_at: new Date().toISOString(),
          })
          .eq('id', emailId);

        console.log(`Self-anchored ${emailId} by ${verifiedWallet}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_credits': {
        const { data: balance, error: balErr } = await supabaseAdmin.rpc('ensure_credit_balance', {
          p_wallet: verifiedWallet,
        });
        if (balErr) throw balErr;

        const { data: ledger } = await supabaseAdmin
          .from('credit_ledger')
          .select('delta, reason, balance_after, created_at')
          .eq('wallet_address', verifiedWallet)
          .order('created_at', { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({ balance, ledger: ledger || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_inbox': {
        const { data: emails, error: fetchError } = await supabaseAdmin
          .from('encrypted_emails')
          .select('*')
          .eq('to_wallet', verifiedWallet)
          .order('timestamp', { ascending: false });
        
        if (fetchError) {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        }
        
        console.log(`Fetched ${emails?.length || 0} emails`);
        return new Response(
          JSON.stringify({ emails }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_email': {
        const { data: email, error: fetchError } = await supabaseAdmin
          .from('encrypted_emails')
          .select('*')
          .eq('id', data.emailId)
          .or(`from_wallet.eq.${verifiedWallet},to_wallet.eq.${verifiedWallet}`)
          .single();
        
        if (fetchError) {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        }
        
        // Fetch attachments for this email
        const { data: attachments, error: attachmentsError } = await supabaseAdmin
          .from('email_attachments')
          .select('*')
          .eq('email_id', data.emailId)
          .order('created_at', { ascending: true });
        
        if (attachmentsError) {
          console.error('Attachments fetch error:', attachmentsError);
        }
        
        console.log('Email fetched successfully with attachments');
        return new Response(
          JSON.stringify({ email, attachments: attachments || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'mark_read': {
        const { error: updateError } = await supabaseAdmin
          .from('encrypted_emails')
          .update({ read: true })
          .eq('id', data.emailId)
          .eq('to_wallet', verifiedWallet);
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        
        console.log('Email marked as read');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_sent': {
        const { data: emails, error: fetchError } = await supabaseAdmin
          .from('encrypted_emails')
          .select('*')
          .eq('from_wallet', verifiedWallet)
          .order('timestamp', { ascending: false });
        
        if (fetchError) {
          console.error('Fetch sent error:', fetchError);
          throw fetchError;
        }
        
        console.log(`Fetched ${emails?.length || 0} sent emails`);
        return new Response(
          JSON.stringify({ emails }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_email': {
        // First verify the user owns this email (either sent or received)
        const { data: email, error: verifyError } = await supabaseAdmin
          .from('encrypted_emails')
          .select('*')
          .eq('id', data.emailId)
          .or(`from_wallet.eq.${verifiedWallet},to_wallet.eq.${verifiedWallet}`)
          .single();
        
        if (verifyError || !email) {
          console.error('Verify error:', verifyError);
          throw new Error('Email not found or access denied');
        }
        
        const { error: deleteError } = await supabaseAdmin
          .from('encrypted_emails')
          .delete()
          .eq('id', data.emailId);
        
        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
        
        console.log('Email deleted successfully');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save_draft': {
        const { draftId, to_wallet, encrypted_subject, encrypted_body } = data;
        
        if (draftId) {
          // Update existing draft
          const { error: updateError } = await supabaseAdmin
            .from('email_drafts')
            .update({
              to_wallet,
              encrypted_subject,
              encrypted_body,
              updated_at: new Date().toISOString(),
            })
            .eq('id', draftId)
            .eq('wallet_address', verifiedWallet);

          if (updateError) {
            console.error('Draft update error:', updateError);
            throw updateError;
          }

          console.log(`Draft ${draftId} updated`);
          return new Response(
            JSON.stringify({ success: true, draftId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Create new draft
          const { data: newDraft, error: insertError } = await supabaseAdmin
            .from('email_drafts')
            .insert({
              wallet_address: verifiedWallet,
              to_wallet,
              encrypted_subject,
              encrypted_body,
            })
            .select()
            .single();

          if (insertError || !newDraft) {
            console.error('Draft insert error:', insertError);
            throw insertError;
          }

          console.log('Draft created');
          return new Response(
            JSON.stringify({ success: true, draftId: newDraft.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'get_drafts': {
        const { data: drafts, error } = await supabaseAdmin
          .from('email_drafts')
          .select('*')
          .eq('wallet_address', verifiedWallet)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Get drafts error:', error);
          throw error;
        }

        console.log(`Fetched ${drafts?.length || 0} drafts`);
        return new Response(
          JSON.stringify({ drafts: drafts || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_draft': {
        const { draftId } = data;

        if (!draftId) {
          throw new Error('Draft ID required');
        }

        const { data: draft, error } = await supabaseAdmin
          .from('email_drafts')
          .select('*')
          .eq('id', draftId)
          .eq('wallet_address', verifiedWallet)
          .maybeSingle();

        if (error || !draft) {
          console.error('Get draft error:', error);
          throw new Error('Draft not found');
        }

        console.log('Draft fetched');
        return new Response(
          JSON.stringify({ draft }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_draft': {
        const { draftId } = data;

        if (!draftId) {
          throw new Error('Draft ID required');
        }

        const { error: deleteError } = await supabaseAdmin
          .from('email_drafts')
          .delete()
          .eq('id', draftId)
          .eq('wallet_address', verifiedWallet);

        if (deleteError) {
          console.error('Delete draft error:', deleteError);
          throw deleteError;
        }

        console.log('Draft deleted');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === ATTACHMENT ACTIONS ===
      
      case 'upload_attachment': {
        const { draftId, fileName, fileSize, mimeType, encryptedSymmetricKey, iv } = data;
        
        const encryptedFileName = `${verifiedWallet}/${crypto.randomUUID()}`;
        
        const { data: attachment, error } = await supabaseAdmin
          .from('email_attachments')
          .insert({
            draft_id: draftId,
            wallet_address: verifiedWallet,
            file_name: fileName,
            encrypted_file_name: encryptedFileName,
            file_size_bytes: fileSize,
            mime_type: mimeType,
            encrypted_symmetric_key: encryptedSymmetricKey,
            iv: iv
          })
          .select()
          .single();
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ attachment, uploadPath: encryptedFileName }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_attachments': {
        const { emailId, draftId } = data;
        
        const query = supabaseAdmin
          .from('email_attachments')
          .select('*');
          
        if (emailId) query.eq('email_id', emailId);
        if (draftId) query.eq('draft_id', draftId);
        
        const { data: attachments, error } = await query;
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ attachments: attachments || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_attachment': {
        const { attachmentId } = data;
        
        const { data: attachment, error: fetchError } = await supabaseAdmin
          .from('email_attachments')
          .select('*')
          .eq('id', attachmentId)
          .eq('wallet_address', verifiedWallet)
          .single();
          
        if (fetchError || !attachment) throw new Error('Attachment not found');
        
        const { error: storageError } = await supabaseAdmin
          .storage
          .from('email-attachments')
          .remove([attachment.encrypted_file_name]);
          
        if (storageError) console.error('Storage delete error:', storageError);
        
        const { error: deleteError } = await supabaseAdmin
          .from('email_attachments')
          .delete()
          .eq('id', attachmentId);
          
        if (deleteError) throw deleteError;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'attach_to_email': {
        const { draftId, emailId } = data;
        
        const { error } = await supabaseAdmin
          .from('email_attachments')
          .update({ email_id: emailId, draft_id: null })
          .eq('draft_id', draftId);
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === LABEL ACTIONS ===

      case 'create_label': {
        const { name, color, icon } = data;
        
        const { data: label, error } = await supabaseAdmin
          .from('email_labels')
          .insert({
            wallet_address: verifiedWallet,
            name,
            color: color || '#3b82f6',
            icon: icon || 'tag'
          })
          .select()
          .single();
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ label }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_labels': {
        const { data: labels, error } = await supabaseAdmin
          .from('email_labels')
          .select('*')
          .eq('wallet_address', verifiedWallet)
          .order('name');
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ labels: labels || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_label': {
        const { emailId, labelId } = data;
        
        const { error } = await supabaseAdmin
          .from('email_label_assignments')
          .insert({
            email_id: emailId,
            label_id: labelId,
            wallet_address: verifiedWallet
          });
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove_label': {
        const { emailId, labelId } = data;
        
        const { error } = await supabaseAdmin
          .from('email_label_assignments')
          .delete()
          .eq('email_id', emailId)
          .eq('label_id', labelId)
          .eq('wallet_address', verifiedWallet);
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_emails_by_label': {
        const { labelId } = data;
        
        const { data: assignments, error: assignError } = await supabaseAdmin
          .from('email_label_assignments')
          .select('email_id')
          .eq('label_id', labelId)
          .eq('wallet_address', verifiedWallet);
          
        if (assignError) throw assignError;
        
        const emailIds = (assignments || []).map(a => a.email_id);
        
        const { data: emails, error: emailError } = await supabaseAdmin
          .from('encrypted_emails')
          .select('*')
          .in('id', emailIds)
          .order('timestamp', { ascending: false });
          
        if (emailError) throw emailError;
        
        return new Response(
          JSON.stringify({ emails: emails || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === TEMPLATE ACTIONS ===

      case 'create_template': {
        const { name, description, encryptedSubject, encryptedBody, variables } = data;
        
        const { data: template, error } = await supabaseAdmin
          .from('email_templates')
          .insert({
            wallet_address: verifiedWallet,
            name,
            description,
            encrypted_subject: encryptedSubject,
            encrypted_body: encryptedBody,
            variables: variables || []
          })
          .select()
          .single();
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ template }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_templates': {
        const { data: templates, error } = await supabaseAdmin
          .from('email_templates')
          .select('*')
          .eq('wallet_address', verifiedWallet)
          .order('is_favorite', { ascending: false })
          .order('use_count', { ascending: false });
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ templates: templates || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'use_template': {
        const { templateId } = data;
        
        const { error } = await supabaseAdmin
          .from('email_templates')
          .update({
            use_count: supabaseAdmin.rpc('increment_use_count'),
            last_used_at: new Date().toISOString()
          })
          .eq('id', templateId)
          .eq('wallet_address', verifiedWallet);
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_template': {
        const { templateId } = data;
        
        const { error } = await supabaseAdmin
          .from('email_templates')
          .delete()
          .eq('id', templateId)
          .eq('wallet_address', verifiedWallet);
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === SCHEDULED EMAIL ACTIONS ===

      case 'schedule_email': {
        const { toWallet, encryptedSubject, encryptedBody, scheduledFor, timezone, senderSignature } = data;
        
        if (new Date(scheduledFor) <= new Date()) {
          throw new Error('Scheduled time must be in the future');
        }
        
        const { data: scheduled, error } = await supabaseAdmin
          .from('scheduled_emails')
          .insert({
            wallet_address: verifiedWallet,
            to_wallet: toWallet,
            encrypted_subject: encryptedSubject,
            encrypted_body: encryptedBody,
            scheduled_for: scheduledFor,
            timezone: timezone || 'UTC',
            sender_signature: senderSignature
          })
          .select()
          .single();
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ scheduledEmail: scheduled }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_scheduled_emails': {
        const { data: scheduledEmails, error } = await supabaseAdmin
          .from('scheduled_emails')
          .select('*')
          .eq('wallet_address', verifiedWallet)
          .in('status', ['pending', 'failed'])
          .order('scheduled_for', { ascending: true });
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ scheduledEmails: scheduledEmails || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel_scheduled_email': {
        const { scheduledId } = data;
        
        const { error } = await supabaseAdmin
          .from('scheduled_emails')
          .update({ status: 'cancelled' })
          .eq('id', scheduledId)
          .eq('wallet_address', verifiedWallet)
          .eq('status', 'pending');
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reschedule_email': {
        const { scheduledId, newScheduledFor } = data;
        
        if (new Date(newScheduledFor) <= new Date()) {
          throw new Error('Scheduled time must be in the future');
        }
        
        const { error } = await supabaseAdmin
          .from('scheduled_emails')
          .update({ scheduled_for: newScheduledFor })
          .eq('id', scheduledId)
          .eq('wallet_address', verifiedWallet)
          .eq('status', 'pending');
          
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Unknown action');
    }
  } catch (error) {
    console.error('Error in secure-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
