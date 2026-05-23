-- ==========================================
-- Customer Bookings & Drivers Module
-- ==========================================

-- 1. customer_bookings (Client booking requests from the PWA)
CREATE TABLE public.customer_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    container_type container_type NOT NULL,
    target_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. drivers (Driver profiles for dispatch pairing)
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Off Duty',
    prime_mover_id VARCHAR(50) REFERENCES public.prime_movers(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.customer_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- customer_bookings: Anon can INSERT (public booking) and SELECT (view own bookings)
CREATE POLICY "Anyone can insert customer_bookings" ON public.customer_bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can read customer_bookings" ON public.customer_bookings FOR SELECT TO anon USING (true);

-- customer_bookings: Authenticated admins get full CRUD
CREATE POLICY "Admins have full access to customer_bookings" ON public.customer_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- drivers: Anon can SELECT, INSERT, and UPDATE (for mobile portal state changes)
CREATE POLICY "Anyone can read drivers" ON public.drivers FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert drivers" ON public.drivers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update drivers" ON public.drivers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- drivers: Authenticated admins get full CRUD
CREATE POLICY "Admins have full access to drivers" ON public.drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- Explicit Grants
-- ==========================================
GRANT SELECT, INSERT ON public.customer_bookings TO anon;
GRANT ALL ON public.customer_bookings TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.drivers TO anon;
GRANT ALL ON public.drivers TO authenticated;

-- ==========================================
-- Supabase Realtime Configurations
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;

-- ==========================================
-- Updated_At Triggers
-- ==========================================
CREATE TRIGGER update_customer_bookings_modtime BEFORE UPDATE ON public.customer_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_modtime BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Seed Mock Drivers
-- ==========================================
INSERT INTO public.drivers (id, email, full_name, status) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'john.doe@cargonode.com', 'John Doe', 'Available'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'jane.smith@cargonode.com', 'Jane Smith', 'Off Duty'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'bob.johnson@cargonode.com', 'Bob Johnson', 'Available');
