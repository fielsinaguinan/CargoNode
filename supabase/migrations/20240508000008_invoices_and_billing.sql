-- ==========================================
-- Invoices & Billing Module
-- ==========================================

-- 1. Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.customer_bookings(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'PHP',
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Under Review, Paid, Overdue, Rejected
    due_date TIMESTAMPTZ,
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Clients can read their own invoices
CREATE POLICY "Clients can read their own invoices" 
ON public.invoices FOR SELECT TO authenticated 
USING (client_id = auth.uid());

-- Clients can update their own invoices (to upload proof)
CREATE POLICY "Clients can update their own invoices" 
ON public.invoices FOR UPDATE TO authenticated 
USING (client_id = auth.uid()) 
WITH CHECK (client_id = auth.uid());

-- Admins have full access to invoices
CREATE POLICY "Admins have full access to invoices" 
ON public.invoices FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
) 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
);

-- 3. Explicit Grants
GRANT ALL ON public.invoices TO authenticated;

-- 4. Updated_At Trigger
CREATE TRIGGER update_invoices_modtime 
BEFORE UPDATE ON public.invoices 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- ==========================================
-- Storage for Payment Proofs
-- ==========================================
-- Note: Assuming the extension "uuid-ossp" is already active (it is in Supabase by default).

INSERT INTO storage.buckets (id, name, file_size_limit, allowed_mime_types, public)
VALUES (
    'payment_proofs', 
    'payment_proofs', 
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'application/pdf'],
    false -- private bucket
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS for Storage Bucket Objects
CREATE POLICY "Clients can upload their own proofs" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'payment_proofs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Clients can update their own proofs" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
    bucket_id = 'payment_proofs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Clients can view their own proofs" 
ON storage.objects FOR SELECT TO authenticated 
USING (
    bucket_id = 'payment_proofs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins have full access to payment proofs" 
ON storage.objects FOR ALL TO authenticated 
USING (
    bucket_id = 'payment_proofs' AND 
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
)
WITH CHECK (
    bucket_id = 'payment_proofs' AND 
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
);
