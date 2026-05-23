-- =========================================================================
-- Migration: Client Profiles, Columns, and Row-Level Security (RLS)
-- =========================================================================

-- 1. Create client_profiles Table
CREATE TABLE public.client_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add client_id Foreign Key to customer_bookings and waybills
ALTER TABLE public.customer_bookings ADD COLUMN client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.waybills ADD COLUMN client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Enable RLS on client_profiles
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies for client_profiles
CREATE POLICY "Clients can view their own profile" 
ON public.client_profiles FOR SELECT TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Clients can insert their own profile" 
ON public.client_profiles FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Clients can update their own profile" 
ON public.client_profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access to client profiles" 
ON public.client_profiles FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
) 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
);

-- 5. Rewrite customer_bookings RLS Policies
DROP POLICY IF EXISTS "Anyone can insert customer_bookings" ON public.customer_bookings;
DROP POLICY IF EXISTS "Anyone can read customer_bookings" ON public.customer_bookings;
DROP POLICY IF EXISTS "Admins have full access to customer_bookings" ON public.customer_bookings;

-- Admins: full CRUD
CREATE POLICY "Admins have full access to customer_bookings" 
ON public.customer_bookings FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
) 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
);

-- Clients: Select and Insert own bookings
CREATE POLICY "Clients can read their own bookings" 
ON public.customer_bookings FOR SELECT TO authenticated 
USING (client_id = auth.uid());

CREATE POLICY "Clients can insert their own bookings" 
ON public.customer_bookings FOR INSERT TO authenticated 
WITH CHECK (client_id = auth.uid());

-- 6. Rewrite waybills RLS Policies
DROP POLICY IF EXISTS "Admins have full access to waybills" ON public.waybills;
DROP POLICY IF EXISTS "Anyone can read waybills" ON public.waybills;

-- Admins: full CRUD
CREATE POLICY "Admins have full access to waybills" 
ON public.waybills FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
) 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid())
);

-- Clients: read their own waybills
CREATE POLICY "Clients can read their own waybills" 
ON public.waybills FOR SELECT TO authenticated 
USING (client_id = auth.uid());

-- Public: Read single waybill by tracking code (for track-and-trace)
CREATE POLICY "Anyone can track waybills by tracking number" 
ON public.waybills FOR SELECT TO anon 
USING (true);

-- 7. Add Triggers for client_profiles updated_at
CREATE TRIGGER update_client_profiles_modtime 
BEFORE UPDATE ON public.client_profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Explicit Grants
GRANT ALL ON public.client_profiles TO authenticated;
