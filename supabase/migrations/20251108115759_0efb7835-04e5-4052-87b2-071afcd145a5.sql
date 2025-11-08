-- Add starred column to encrypted_emails table
ALTER TABLE public.encrypted_emails 
ADD COLUMN starred boolean NOT NULL DEFAULT false;

-- Add index for faster starred email queries
CREATE INDEX idx_encrypted_emails_starred ON public.encrypted_emails(to_wallet, starred) WHERE starred = true;

-- Add index for faster inbox queries with starred
CREATE INDEX idx_encrypted_emails_inbox_starred ON public.encrypted_emails(to_wallet, read, starred);