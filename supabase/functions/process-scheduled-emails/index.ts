import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing scheduled emails...');

    // Get pending scheduled emails that are due
    const { data: scheduledEmails, error: fetchError } = await supabaseAdmin
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (fetchError) throw fetchError;

    console.log(`Found ${scheduledEmails?.length || 0} emails to send`);

    const results = [];
    
    for (const scheduled of scheduledEmails || []) {
      try {
        // Insert into encrypted_emails
        const { error: insertError } = await supabaseAdmin
          .from('encrypted_emails')
          .insert({
            from_wallet: scheduled.wallet_address,
            to_wallet: scheduled.to_wallet,
            encrypted_subject: scheduled.encrypted_subject,
            encrypted_body: scheduled.encrypted_body,
            sender_signature: scheduled.sender_signature,
            timestamp: new Date().toISOString()
          });

        if (insertError) throw insertError;

        // Update scheduled email status
        await supabaseAdmin
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', scheduled.id);

        console.log(`Sent scheduled email ${scheduled.id}`);
        results.push({ id: scheduled.id, status: 'sent' });
      } catch (error) {
        // Mark as failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabaseAdmin
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: errorMessage
          })
          .eq('id', scheduled.id);

        console.error(`Failed to send ${scheduled.id}:`, errorMessage);
        results.push({ id: scheduled.id, status: 'failed', error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
