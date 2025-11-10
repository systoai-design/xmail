-- Add sender encrypted copies to encrypted_emails table
ALTER TABLE encrypted_emails 
ADD COLUMN sender_encrypted_subject TEXT,
ADD COLUMN sender_encrypted_body TEXT;

-- Add index for faster sender queries
CREATE INDEX IF NOT EXISTS idx_emails_from_wallet ON encrypted_emails(from_wallet);

-- Add comment for documentation
COMMENT ON COLUMN encrypted_emails.sender_encrypted_subject IS 'Subject encrypted with sender public key so they can read their sent emails';
COMMENT ON COLUMN encrypted_emails.sender_encrypted_body IS 'Body encrypted with sender public key so they can read their sent emails';