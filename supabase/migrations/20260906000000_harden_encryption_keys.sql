-- STOP-GAP: close the anonymous key-substitution hole on encryption_keys.
--
-- Prior state: FOR UPDATE USING (true) WITH CHECK (true) with anon access, meaning
-- any unauthenticated caller could overwrite any wallet's public key and thereby
-- receive/decrypt all future mail addressed to that wallet.
--
-- Keys become insert-once and immutable. Rotation must go through a signature-verified
-- path (SIWE-backed JWT or an Edge Function), not a blanket UPDATE grant.
-- This is a mitigation, not the fix: SELECT stays open because the app has no auth
-- context yet to scope it by.

DROP POLICY IF EXISTS "Anyone can update encryption keys" ON public.encryption_keys;
DROP POLICY IF EXISTS "Anyone can update their public key" ON public.encryption_keys;

-- Defence in depth: even a future permissive policy cannot mutate an existing key.
CREATE OR REPLACE FUNCTION public.reject_encryption_key_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'encryption_keys is append-only; rotate via a signature-verified path'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS encryption_keys_no_update ON public.encryption_keys;
CREATE TRIGGER encryption_keys_no_update
  BEFORE UPDATE OR DELETE ON public.encryption_keys
  FOR EACH ROW EXECUTE FUNCTION public.reject_encryption_key_mutation();

-- One key per wallet, enforced at the storage layer.
CREATE UNIQUE INDEX IF NOT EXISTS encryption_keys_wallet_address_uniq
  ON public.encryption_keys (wallet_address);
