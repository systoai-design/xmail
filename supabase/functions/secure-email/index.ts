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
        
        // Insert email with both recipient and sender encrypted copies
        const emailData = {
          from_wallet: data.from_wallet,
          to_wallet: data.to_wallet,
          encrypted_subject: data.encrypted_subject,
          encrypted_body: data.encrypted_body,
          sender_encrypted_subject: data.sender_encrypted_subject,
          sender_encrypted_body: data.sender_encrypted_body,
          sender_signature: data.sender_signature,
          payment_tx_signature: data.payment_tx_signature,
        };
        
        const { error: insertError } = await supabaseAdmin
          .from('encrypted_emails')
          .insert(emailData);
        
        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        
        console.log('Email sent successfully with sender copy');
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
