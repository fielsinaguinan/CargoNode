-- ==========================================
-- 1. Clean up SMS logic
-- ==========================================

-- Drop the old SMS trigger
DROP TRIGGER IF EXISTS waybill_sms_trigger ON public.waybills;

-- Drop the old SMS function
DROP FUNCTION IF EXISTS notify_waybill_update();

-- Remove the SMS global setting
DELETE FROM public.system_settings WHERE key = 'sms_alerts_enabled';

-- ==========================================
-- 2. Setup Webhook for Email
-- ==========================================

-- Create system settings for Email
INSERT INTO public.system_settings (key, value, description)
VALUES ('email_alerts_enabled', 'true'::jsonb, 'Global toggle for sending Email notifications to clients')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION notify_waybill_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url text;
BEGIN
  -- Defaults to local Supabase Edge Function URL inside Docker network
  edge_url := COALESCE(
    current_setting('app.settings.edge_function_url', true),
    'http://supabase_kong:8000/functions/v1/send-email'
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

DROP TRIGGER IF EXISTS waybill_email_trigger ON public.waybills;
CREATE TRIGGER waybill_email_trigger
AFTER INSERT OR UPDATE ON public.waybills
FOR EACH ROW
EXECUTE FUNCTION notify_waybill_email();
