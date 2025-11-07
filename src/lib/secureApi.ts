import { supabase } from '@/integrations/supabase/client';
import bs58 from 'bs58';

export async function callSecureEndpoint(
  action: string,
  data: any,
  walletPublicKey: any,
  signMessage: any
) {
  try {
    // Create signature
    const messageBytes = new TextEncoder().encode(JSON.stringify(data));
    const signature = await signMessage(messageBytes);
    const signatureBase58 = bs58.encode(signature);

    console.log('Calling secure endpoint:', action);

    // Call edge function
    const { data: response, error } = await supabase.functions.invoke('secure-email', {
      body: {
        action,
        data,
        signature: signatureBase58,
        walletPublicKey: walletPublicKey.toBase58(),
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
