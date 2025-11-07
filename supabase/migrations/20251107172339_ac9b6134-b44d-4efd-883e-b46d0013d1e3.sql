-- Create email templates table
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    encrypted_subject TEXT NOT NULL,
    encrypted_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT false
);

CREATE INDEX idx_templates_wallet ON public.email_templates(wallet_address);
CREATE INDEX idx_templates_favorite ON public.email_templates(wallet_address, is_favorite);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own templates"
ON public.email_templates FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();