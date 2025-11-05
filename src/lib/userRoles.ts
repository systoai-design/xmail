import { supabase } from '@/integrations/supabase/client';

export async function isAdmin(walletAddress: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('wallet_address', walletAddress)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}
