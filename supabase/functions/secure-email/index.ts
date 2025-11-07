import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import bs58 from 'https://esm.sh/bs58@5.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data, signature, walletPublicKey } = await req.json();

    console.log(`Action: ${action}, Wallet: ${walletPublicKey}`);

    // Verify signature
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

    console.log('Signature verified successfully');

    // Handle different actions
    switch (action) {
      case 'send_email': {
        // Verify sender matches wallet
        if (data.from_wallet !== walletPublicKey) {
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
          .eq('to_wallet', walletPublicKey)
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
          .eq('to_wallet', walletPublicKey)
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
          .eq('to_wallet', walletPublicKey);
        
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
