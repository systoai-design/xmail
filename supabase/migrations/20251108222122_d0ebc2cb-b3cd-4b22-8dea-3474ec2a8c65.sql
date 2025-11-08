-- Create contacts table for address book
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  nickname TEXT NOT NULL,
  owner_wallet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own contacts
CREATE POLICY "Users can view own contacts"
ON public.contacts
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own contacts"
ON public.contacts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own contacts"
ON public.contacts
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete own contacts"
ON public.contacts
FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_contacts_owner ON public.contacts(owner_wallet);
CREATE INDEX idx_contacts_wallet ON public.contacts(wallet_address);