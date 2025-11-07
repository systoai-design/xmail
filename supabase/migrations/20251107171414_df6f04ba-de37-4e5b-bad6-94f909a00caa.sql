-- Create email drafts table
CREATE TABLE IF NOT EXISTS public.email_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    to_wallet TEXT,
    encrypted_subject TEXT,
    encrypted_body TEXT,
    auto_saved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_drafts_wallet ON public.email_drafts(wallet_address);
CREATE INDEX idx_email_drafts_updated ON public.email_drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own drafts
CREATE POLICY "Users can view own drafts"
    ON public.email_drafts
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own drafts"
    ON public.email_drafts
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own drafts"
    ON public.email_drafts
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete own drafts"
    ON public.email_drafts
    FOR DELETE
    USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON public.email_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();