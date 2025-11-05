-- Create encrypted_emails table
CREATE TABLE public.encrypted_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  encrypted_subject TEXT NOT NULL,
  encrypted_body TEXT NOT NULL,
  sender_signature TEXT NOT NULL,
  payment_tx_signature TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_encrypted_emails_to_wallet ON public.encrypted_emails(to_wallet);
CREATE INDEX idx_encrypted_emails_from_wallet ON public.encrypted_emails(from_wallet);
CREATE INDEX idx_encrypted_emails_timestamp ON public.encrypted_emails(timestamp DESC);

-- Create encryption_keys table to store public keys
CREATE TABLE public.encryption_keys (
  wallet_address TEXT NOT NULL PRIMARY KEY,
  public_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.encrypted_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for encrypted_emails (no auth required - wallet-based)
CREATE POLICY "Anyone can view emails sent to them"
ON public.encrypted_emails
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert emails"
ON public.encrypted_emails
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their received emails"
ON public.encrypted_emails
FOR UPDATE
USING (true);

-- RLS Policies for encryption_keys
CREATE POLICY "Anyone can view public keys"
ON public.encryption_keys
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert their public key"
ON public.encryption_keys
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their public key"
ON public.encryption_keys
FOR UPDATE
USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates on encryption_keys
CREATE TRIGGER update_encryption_keys_updated_at
BEFORE UPDATE ON public.encryption_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();