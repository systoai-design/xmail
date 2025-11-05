-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'tester', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (wallet_address, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_wallet_address TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE wallet_address = _wallet_address
      AND role = _role
  )
$$;

-- RLS Policy: Anyone can view roles (needed for client-side checks)
CREATE POLICY "Anyone can view roles"
ON public.user_roles
FOR SELECT
USING (true);

-- Insert admin testers
INSERT INTO public.user_roles (wallet_address, role) VALUES
  ('2tiaoQgwYj4oRV22LsFBeEExKxPApNKv3VQcnMXHVhFS', 'admin'),
  ('AkTiZY8McV5JztKn7AZuYqfRJcthRpKRXBkx56sNa6H8', 'admin');