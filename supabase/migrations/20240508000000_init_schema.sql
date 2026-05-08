-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Enums
-- ==========================================
CREATE TYPE prime_mover_status AS ENUM ('Active', 'Maintenance', 'In Transit', 'Pier Standby', 'Signal Lost');
CREATE TYPE container_type AS ENUM ('20-footer', '40-footer', 'LCL');
CREATE TYPE waybill_status AS ENUM ('Loading', 'In Transit', 'Delayed', 'Delivered');
CREATE TYPE tracking_status AS ENUM ('pending', 'current', 'completed');
CREATE TYPE maintenance_status AS ENUM ('Pending', 'Resolved');

-- ==========================================
-- Tables
-- ==========================================

-- 1. prime_movers (Fleet Vehicles)
CREATE TABLE public.prime_movers (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'PM-102'
    status prime_mover_status DEFAULT 'Pier Standby',
    current_location VARCHAR(255),
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. waybills (Cargo & Dispatch Info)
CREATE TABLE public.waybills (
    tracking_number VARCHAR(100) PRIMARY KEY, -- e.g., 'WAYBILL123'
    client_name VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    container_type container_type NOT NULL,
    status waybill_status DEFAULT 'Loading',
    prime_mover_id VARCHAR(50) REFERENCES public.prime_movers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. tracking_milestones (Timeline events for waybills)
CREATE TABLE public.tracking_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waybill_id VARCHAR(100) REFERENCES public.waybills(tracking_number) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status tracking_status DEFAULT 'pending',
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. gps_logs (High-frequency tracking engine)
CREATE TABLE public.gps_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prime_mover_id VARCHAR(50) REFERENCES public.prime_movers(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. maintenance_alerts (Preventive maintenance module)
CREATE TABLE public.maintenance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prime_mover_id VARCHAR(50) REFERENCES public.prime_movers(id) ON DELETE CASCADE,
    alert_type VARCHAR(255) NOT NULL,
    triggered_at_mileage DOUBLE PRECISION NOT NULL,
    status maintenance_status DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.prime_movers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_alerts ENABLE ROW LEVEL SECURITY;

-- Admins (Authenticated) get full CRUD access to all tables
CREATE POLICY "Admins have full access to prime_movers" ON public.prime_movers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins have full access to waybills" ON public.waybills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins have full access to tracking_milestones" ON public.tracking_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins have full access to gps_logs" ON public.gps_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins have full access to maintenance_alerts" ON public.maintenance_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Client Portal PWA (Public/Anon) gets READ-ONLY access strictly for tracking data
CREATE POLICY "Anyone can read waybills" ON public.waybills FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can read tracking_milestones" ON public.tracking_milestones FOR SELECT TO anon USING (true);

-- ==========================================
-- Supabase Realtime Configurations
-- ==========================================
-- Enable real-time subscriptions for critical live-tracking tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.prime_movers, 
    public.gps_logs, 
    public.waybills;

-- ==========================================
-- Updated_At Triggers (Optional but good practice)
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prime_movers_modtime BEFORE UPDATE ON public.prime_movers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_waybills_modtime BEFORE UPDATE ON public.waybills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_alerts_modtime BEFORE UPDATE ON public.maintenance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
