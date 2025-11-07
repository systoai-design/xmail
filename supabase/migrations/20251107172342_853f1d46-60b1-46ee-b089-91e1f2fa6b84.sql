-- Create scheduled emails table
CREATE TABLE public.scheduled_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    encrypted_subject TEXT NOT NULL,
    encrypted_body TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sender_signature TEXT NOT NULL
);

CREATE INDEX idx_scheduled_emails_wallet ON public.scheduled_emails(wallet_address);
CREATE INDEX idx_scheduled_emails_scheduled ON public.scheduled_emails(scheduled_for, status);
CREATE INDEX idx_scheduled_emails_status ON public.scheduled_emails(status);

-- Enable RLS
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own scheduled emails"
ON public.scheduled_emails FOR ALL
USING (true)
WITH CHECK (true);

-- Add validation trigger for scheduled_for
CREATE OR REPLACE FUNCTION validate_scheduled_for()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scheduled_for <= NOW() THEN
        RAISE EXCEPTION 'Scheduled time must be in the future';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_scheduled_for_before_insert
    BEFORE INSERT ON public.scheduled_emails
    FOR EACH ROW
    EXECUTE FUNCTION validate_scheduled_for();