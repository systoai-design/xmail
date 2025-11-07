-- Add RLS policies to allow users to register and update their encryption keys
-- Since this is a wallet-based app without Supabase auth, we allow public insert/update
-- Security comes from wallet signatures, not from Supabase auth

CREATE POLICY "Anyone can insert encryption keys"
ON public.encryption_keys
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update encryption keys"
ON public.encryption_keys
FOR UPDATE
USING (true)
WITH CHECK (true);