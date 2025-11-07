-- Create storage bucket for encrypted attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('email-attachments', 'email-attachments', false, 10485760, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'text/*']);

-- Create attachments table
CREATE TABLE public.email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES public.encrypted_emails(id) ON DELETE CASCADE,
    draft_id UUID REFERENCES public.email_drafts(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    file_name TEXT NOT NULL,
    encrypted_file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    encrypted_symmetric_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT email_or_draft CHECK (
        (email_id IS NOT NULL AND draft_id IS NULL) OR 
        (email_id IS NULL AND draft_id IS NOT NULL)
    )
);

CREATE INDEX idx_attachments_email ON public.email_attachments(email_id);
CREATE INDEX idx_attachments_draft ON public.email_attachments(draft_id);
CREATE INDEX idx_attachments_wallet ON public.email_attachments(wallet_address);

-- Enable RLS
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments table
CREATE POLICY "Users can manage own attachments"
ON public.email_attachments FOR ALL
USING (true)
WITH CHECK (true);

-- Storage RLS Policies
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'email-attachments'
);

CREATE POLICY "Users can read attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'email-attachments'
);

CREATE POLICY "Users can delete attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'email-attachments'
);