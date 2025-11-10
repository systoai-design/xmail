-- Add encrypted private key storage columns to encryption_keys table
ALTER TABLE encryption_keys 
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT,
ADD COLUMN IF NOT EXISTS iv TEXT;

COMMENT ON COLUMN encryption_keys.encrypted_private_key IS 'Private key encrypted with wallet-signature-derived key';
COMMENT ON COLUMN encryption_keys.iv IS 'Initialization vector for AES-GCM decryption';