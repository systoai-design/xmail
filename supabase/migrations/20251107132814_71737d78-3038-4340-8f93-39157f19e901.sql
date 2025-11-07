-- Add key creation tracking to encryption_keys table
ALTER TABLE encryption_keys 
ADD COLUMN IF NOT EXISTS key_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to use created_at as key_created_at
UPDATE encryption_keys 
SET key_created_at = created_at 
WHERE key_created_at IS NULL;