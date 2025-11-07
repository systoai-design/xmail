-- Create email labels table
CREATE TABLE public.email_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'tag',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, name)
);

-- Create label assignments (many-to-many)
CREATE TABLE public.email_label_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES public.encrypted_emails(id) ON DELETE CASCADE,
    label_id UUID REFERENCES public.email_labels(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email_id, label_id)
);

CREATE INDEX idx_labels_wallet ON public.email_labels(wallet_address);
CREATE INDEX idx_label_assignments_email ON public.email_label_assignments(email_id);
CREATE INDEX idx_label_assignments_label ON public.email_label_assignments(label_id);

-- Enable RLS
ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own labels"
ON public.email_labels FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can manage own label assignments"
ON public.email_label_assignments FOR ALL
USING (true)
WITH CHECK (true);