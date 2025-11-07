import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import bs58 from 'https://esm.sh/bs58@5.0.0';
import * as djwt from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JWT_SECRET = 'xmail-session-secret-2024'; // In production, use env variable
const SESSION_DURATION = 3600; // 1 hour in seconds

async function generateSessionToken(walletPublicKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

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
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

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

      const messageBytes = new TextEncoder().encode(JSON.stringify(data));
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletPublicKey);
      
      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!verified) {
        console.error('Signature verification failed');
        throw new Error('Invalid signature');
      }

      verifiedWallet = walletPublicKey;
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
        
        const { error: insertError } = await supabaseAdmin
          .from('encrypted_emails')
          .insert(data);
        
        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        
        console.log('Email sent successfully');
        return new Response(
          JSON.stringify({ success: true }),
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
        
        console.log('Email fetched successfully');
        return new Response(
          JSON.stringify({ email }),
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
