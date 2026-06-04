-- Add phone number to drivers
ALTER TABLE public.drivers
ADD COLUMN phone_number VARCHAR(20);

-- Update seed data to add dummy numbers (optional, using existing IDs from seed)
UPDATE public.drivers
SET phone_number = '+639171234567'
WHERE id IN ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803');

-- Create system settings table
CREATE TABLE public.system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed system settings for SMS
INSERT INTO public.system_settings (key, value, description)
VALUES ('sms_alerts_enabled', 'false'::jsonb, 'Global toggle for sending SMS notifications to drivers');

-- RLS for system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_settings" ON public.system_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins have full access to system_settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON public.system_settings TO anon;
GRANT ALL ON public.system_settings TO authenticated;

-- Setup Webhook via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_waybill_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url text;
BEGIN
  -- Defaults to local Supabase Edge Function URL inside Docker network
  -- For production, you will either update this function or set a custom setting.
  edge_url := COALESCE(
    current_setting('app.settings.edge_function_url', true),
    'http://supabase_kong:8000/functions/v1/send-sms'
  );

  PERFORM net.http_post(
    url := edge_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )::jsonb
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waybill_sms_trigger ON public.waybills;
CREATE TRIGGER waybill_sms_trigger
AFTER INSERT OR UPDATE ON public.waybills
FOR EACH ROW
EXECUTE FUNCTION notify_waybill_update();
