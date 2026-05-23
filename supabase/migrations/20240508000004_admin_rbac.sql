-- ==========================================
-- Admin Role-Based Access Control (RBAC)
-- ==========================================

-- 1. Create the admin_role ENUM
CREATE TYPE admin_role AS ENUM ('Superadmin', 'Dispatcher', 'Maintenance');

-- 2. Create the admin_profiles table
CREATE TABLE public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role admin_role NOT NULL DEFAULT 'Dispatcher',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Admin profiles are readable by authenticated users
CREATE POLICY "Admin profiles are readable by authenticated users" ON public.admin_profiles FOR SELECT TO authenticated USING (true);

-- 5. Explicit Grants
GRANT SELECT ON public.admin_profiles TO authenticated;

-- 6. Trigger to keep updated_at in sync
CREATE TRIGGER update_admin_profiles_modtime BEFORE UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Seeding Mock Data
-- ==========================================
DO $$
DECLARE
    dummy_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- Seed existing test users as Superadmin to prevent lock-out
    INSERT INTO public.admin_profiles (id, email, role)
    SELECT id, email, 'Superadmin'::admin_role
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;

    -- Seed dummy dispatcher account in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = dummy_id) THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            dummy_id, 
            '00000000-0000-0000-0000-000000000000'::uuid, 
            'authenticated', 
            'authenticated', 
            'dummy_dispatcher@cargonode.com', 
            '$2a$10$A5j3T4Xg1C.9G0r9m0/RpeO9eP/2O8c3e8J0m9h/D/5vW5/gG0e2a', -- 'password123'
            NOW(), 
            NOW(), 
            NOW()
        );
    END IF;

    -- Seed dummy dispatcher in admin_profiles
    INSERT INTO public.admin_profiles (id, email, role)
    VALUES (dummy_id, 'dummy_dispatcher@cargonode.com', 'Dispatcher')
    ON CONFLICT (id) DO NOTHING;
END $$;
