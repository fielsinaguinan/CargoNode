-- ==========================================
-- Notifications Module
-- ==========================================

CREATE TYPE notification_type AS ENUM ('alert', 'info', 'success');

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins get full CRUD access
CREATE POLICY "Admins have full access to notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- Supabase Realtime Configurations
-- ==========================================
-- Add to the existing supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==========================================
-- Updated_At Triggers
-- ==========================================
CREATE TRIGGER update_notifications_modtime BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
