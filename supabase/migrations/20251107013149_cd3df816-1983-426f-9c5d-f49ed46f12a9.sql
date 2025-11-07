-- Fix RLS policies for wallet-based authentication security
-- Remove overly permissive policies and implement service-role-only access
-- All operations must go through the secure-email edge function

-- Drop existing overly permissive policies on encrypted_emails
DROP POLICY IF EXISTS "Anyone can insert emails" ON encrypted_emails;
DROP POLICY IF EXISTS "Anyone can update their received emails" ON encrypted_emails;
DROP POLICY IF EXISTS "Anyone can view emails sent to them" ON encrypted_emails;

-- Drop existing overly permissive policies on encryption_keys
DROP POLICY IF EXISTS "Anyone can insert their public key" ON encryption_keys;
DROP POLICY IF EXISTS "Anyone can update their public key" ON encryption_keys;
DROP POLICY IF EXISTS "Anyone can view public keys" ON encryption_keys;

-- Create secure policies that only allow service role access
-- This forces all operations to go through the edge function which verifies signatures

-- For encryption_keys: Allow public reads (needed for encryption) but restrict writes
CREATE POLICY "Public keys are publicly readable"
  ON encryption_keys
  FOR SELECT
  USING (true);

-- For encrypted_emails: No direct access, must use edge function
-- (No policies = only service role can access)
