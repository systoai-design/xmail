import { supabase } from '@/integrations/supabase/client';
import bs58 from 'bs58';

const SESSION_TOKEN_KEY = 'xmail_session_token';
const SESSION_WALLET_KEY = 'xmail_session_wallet';
const SESSION_EXPIRY_KEY = 'xmail_session_expiry';

// Read operations that can use session token
const READ_ACTIONS = ['get_inbox', 'get_sent', 'get_email', 'mark_read'];

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
  walletPublicKey: any,
  signMessage: any
): Promise<string> {
  const messageBytes = new TextEncoder().encode(JSON.stringify(data));
  const signature = await signMessage(messageBytes);
  const signatureBase58 = bs58.encode(signature);

  const { data: response, error } = await supabase.functions.invoke('secure-email', {
    body: {
      action: 'authenticate',
      data,
      signature: signatureBase58,
      walletPublicKey: walletPublicKey.toBase58(),
    }
  });

  if (error) throw error;
  return response.sessionToken;
}

export async function callSecureEndpoint(
  action: string,
  data: any,
  walletPublicKey: any,
  signMessage: any
) {
  try {
    const walletAddress = walletPublicKey.toBase58();
    console.log('Calling secure endpoint:', action);

    // Try to use session token for read operations
    if (READ_ACTIONS.includes(action)) {
      let sessionToken = getStoredSession(walletAddress);

      // If no valid session token, authenticate to get one
      if (!sessionToken) {
        console.log('No valid session, authenticating...');
        sessionToken = await authenticateAndGetToken(data, walletPublicKey, signMessage);
        storeSession(sessionToken, walletAddress);
      }

      // Call with session token
      const { data: response, error } = await supabase.functions.invoke('secure-email', {
        body: {
          action,
          data,
          sessionToken,
          walletPublicKey: walletAddress,
        }
      });

      if (error) {
        // If token is invalid, clear session and retry with signature
        if (error.message?.includes('Authentication required') || error.message?.includes('Token')) {
          console.log('Session expired, re-authenticating...');
          clearSession();
          sessionToken = await authenticateAndGetToken(data, walletPublicKey, signMessage);
          storeSession(sessionToken, walletAddress);

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
        throw error;
      }

      return response;
    }

    // Write operations still require signature
    const messageBytes = new TextEncoder().encode(JSON.stringify(data));
    const signature = await signMessage(messageBytes);
    const signatureBase58 = bs58.encode(signature);

    const { data: response, error } = await supabase.functions.invoke('secure-email', {
      body: {
        action,
        data,
        signature: signatureBase58,
        walletPublicKey: walletAddress,
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    return response;
  } catch (error) {
    console.error('Secure API call failed:', error);
    throw error;
  }
}
