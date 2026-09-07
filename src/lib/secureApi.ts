import { supabase } from '@/integrations/supabase/client';
import { createSingleFlight } from '@/lib/singleFlight';

const SESSION_TOKEN_KEY = 'xmail_session_token';
const SESSION_WALLET_KEY = 'xmail_session_wallet';
const SESSION_EXPIRY_KEY = 'xmail_session_expiry';

/**
 * Actions that may authenticate with the session token instead of a fresh
 * wallet signature.
 *
 * Drafts were not on this list, and the composer auto-saves every 10 seconds --
 * so writing an email raised a wallet signature prompt every 10 seconds, plus
 * another on close. In practice nobody approves that, which is why drafts
 * "didn't save": the prompts were dismissed or never noticed.
 *
 * The token is a one-hour bearer minted from a real signature and scoped to the
 * wallet, and it already authorises reading the entire mailbox. Letting it save
 * a draft to your own account is strictly less sensitive than that. Sending,
 * deleting and attachment removal stay signature-gated, because those are the
 * operations a stolen token could actually do damage with.
 */
const SESSION_ACTIONS = [
  'get_inbox',
  'get_sent',
  'get_email',
  'mark_read',
  'get_drafts',
  'get_draft',
  'save_draft',
  'get_credits',
  // Attachments. Each upload previously raised its own Phantom prompt, so
  // attaching three files meant three popups and a lot of waiting -- which is
  // what "uploading takes forever" actually was. These read and write the
  // user's own draft, strictly less sensitive than the mailbox reads the token
  // already covers.
  'upload_attachment',
  'get_attachments',
  'delete_attachment',
  // Cleanup of your own draft, run immediately after a send. Gating it meant a
  // second prompt landed the moment the first one was approved.
  'delete_draft',
  'toggle_star',
  'get_credit_quote',
  'record_anchor',
  'get_unanchored',
  'get_parked',
  'count_parked',
  'get_deliverable_parked',
  'delete_parked',
];

/**
 * functions.invoke reports every non-2xx as the same opaque
 * "Edge Function returned a non-2xx status code" and hides the response body on
 * `error.context`. That makes a precise failure -- out of credits, say --
 * indistinguishable from a crash. Pull the body out so callers can branch on it.
 */
async function enrichError(error: any): Promise<any> {
  try {
    const body = await error?.context?.json?.();
    if (body && typeof body === 'object' && body.error) {
      const enriched = new Error(String(body.error));
      Object.assign(enriched, body);
      return enriched;
    }
  } catch {
    /* not a JSON body; fall through to the original error */
  }
  return error;
}

function getStoredSession(walletAddress: string): string | null {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  const wallet = sessionStorage.getItem(SESSION_WALLET_KEY);
  const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);

  if (!token || !wallet || !expiry) return null;
  if (wallet !== walletAddress) return null;
  if (Date.now() > parseInt(expiry)) {
    clearSession();
    return null;
  }

  return token;
}

function storeSession(token: string, walletAddress: string) {
  const expiry = Date.now() + (3600 * 1000); // 1 hour
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  sessionStorage.setItem(SESSION_WALLET_KEY, walletAddress);
  sessionStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
}

function clearSession() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_WALLET_KEY);
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
}

async function authenticateAndGetToken(
  data: any,
  walletAddress: string,
  signMessage: (message: string) => Promise<string>
): Promise<string> {
  // EIP-191 personal_sign over the exact JSON the server will verify. The
  // wallet shows the user what they are signing, and the server recovers the
  // signer from the signature rather than being told who it is.
  const message = JSON.stringify(data);
  const signature = await signMessage(message);

  const { data: response, error } = await supabase.functions.invoke('secure-email', {
    body: {
      action: 'authenticate',
      data,
      signature,
      walletPublicKey: walletAddress,
    }
  });

  if (error) throw error;
  return response.sessionToken;
}

/**
 * One signature, however many callers.
 *
 * Every caller used to mint its own token. On a cold load six requests go out at
 * once -- inbox, sent, drafts, credits, parked count, parked flush -- and each
 * one independently found no token and raised its own Phantom prompt. React
 * StrictMode double-invokes effects in development, so that was twelve prompts
 * before the composer had even opened.
 *
 * The in-flight promise is shared, so concurrent callers queue behind a single
 * signature instead of each asking for their own. Cleared in `finally` so a
 * rejected signature does not poison every later request.
 */
const authFlight = createSingleFlight<string>();

/**
 * Circuit breaker.
 *
 * A signature prompt is the most intrusive thing this app can do, so the number
 * of them is worth bounding absolutely rather than trusting every call site to
 * behave. If something upstream ever loops again, the user gets a legible error
 * instead of an endless run of Phantom popups.
 */
const AUTH_WINDOW_MS = 30_000;
const AUTH_MAX_IN_WINDOW = 3;
let authTimes: number[] = [];

function assertNotStorming() {
  const now = Date.now();
  authTimes = authTimes.filter((t) => now - t < AUTH_WINDOW_MS);
  if (authTimes.length >= AUTH_MAX_IN_WINDOW) {
    throw new Error(
      'Too many signature requests in a row. Reload the page; if it repeats, this is a bug worth reporting.',
    );
  }
  authTimes.push(now);
}

async function getSessionToken(
  walletAddress: string,
  data: any,
  signerAddress: string,
  signMessage: (message: string) => Promise<string>,
  forceNew = false,
): Promise<string> {
  if (!forceNew) {
    const existing = getStoredSession(walletAddress);
    if (existing) return existing;
  }

  return authFlight.run(async () => {
    assertNotStorming();
    const token = await authenticateAndGetToken(data, signerAddress, signMessage);
    storeSession(token, walletAddress);
    return token;
  });
}

export async function callSecureEndpoint(
  action: string,
  data: any,
  wallet: string,
  signMessage: (message: string) => Promise<string>
) {
  try {
    // Lowercase throughout: wallets return checksummed addresses, every column
    // holds lowercase, and one mismatched comparison is an empty mailbox.
    const walletAddress = wallet.toLowerCase();
    console.log('Calling secure endpoint:', action);

    // Session-token path: at most one wallet prompt, shared by all callers.
    if (SESSION_ACTIONS.includes(action)) {
      let sessionToken = await getSessionToken(walletAddress, data, walletAddress, signMessage);

      // Call with session token
      const { data: response, error } = await supabase.functions.invoke('secure-email', {
        body: {
          action,
          data,
          sessionToken,
          walletPublicKey: walletAddress,
        }
      });

      // A rejected token has to be retried with a real signature. The previous
      // condition matched on error.message containing 'Authentication required',
      // but functions.invoke never surfaces the response body there -- it reports
      // 'Edge Function returned a non-2xx status code'. So the branch was dead
      // and a stale token stranded the tab until sessionStorage was cleared by
      // hand. Any failure on a token we supplied is worth one signed retry.
      // Only an ACTUAL auth failure may discard the session. Re-authenticating
      // on any error meant a single broken endpoint threw away the shared token
      // and made every other caller ask for a new signature -- turning one bad
      // request into a stream of Phantom prompts.
      if (error) {
        const status = error?.context?.status;
        if (status !== 401 && status !== 403) {
          console.error(`Edge function error on ${action} (status ${status}):`, error);
          throw await enrichError(error);
        }

        console.log('Session expired, re-authenticating once...');
        clearSession();
        sessionToken = await getSessionToken(walletAddress, data, walletAddress, signMessage, true);

        const { data: retryResponse, error: retryError } = await supabase.functions.invoke('secure-email', {
          body: {
            action,
            data,
            sessionToken,
            walletPublicKey: walletAddress,
          }
        });

        if (retryError) throw retryError;
        return retryResponse;
      }

      return response;
    }

    // Everything else still requires a fresh signature.
    const signature = await signMessage(JSON.stringify(data));

    const { data: response, error } = await supabase.functions.invoke('secure-email', {
      body: {
        action,
        data,
        signature,
        walletPublicKey: walletAddress,
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw await enrichError(error);
    }

    return response;
  } catch (error) {
    console.error('Secure API call failed:', error);
    throw error;
  }
}
