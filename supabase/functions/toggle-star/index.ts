import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { emailId, starred } = await req.json();

    if (!emailId || typeof starred !== 'boolean') {
      throw new Error('Missing required fields: emailId and starred');
    }

    console.log(`Toggling star for email ${emailId} to ${starred}`);

    // Update the starred status
    const { data, error } = await supabase
      .from('encrypted_emails')
      .update({ starred })
      .eq('id', emailId)
      .select()
      .single();

    if (error) {
      console.error('Error updating starred status:', error);
      throw error;
    }

    console.log('Star status updated successfully:', data);

    return new Response(
      JSON.stringify({ success: true, email: data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in toggle-star function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
