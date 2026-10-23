-- Migration: Immediate Email Notifications for New Inquiries via Supabase Database Webhook
-- This migration provisions the pg_net background HTTP dispatcher to trigger the
-- `send-inquiry-notification` Edge Function whenever a new row is inserted into public.sample_inquiries.
--
-- DESIGN GUARANTEE:
-- pg_net dispatches HTTP requests asynchronously in the background. Failures in the network,
-- Edge Function, or email delivery provider NEVER abort or roll back the customer's saved inquiry.

-- 1. Ensure the pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Define the asynchronous webhook dispatcher function
CREATE OR REPLACE FUNCTION public.notify_inquiry_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  project_ref TEXT := 'jmpzsxctynbdqyysxkah';
  edge_function_url TEXT;
  webhook_secret TEXT;
  request_payload JSONB;
BEGIN
  -- Construct Edge Function target URL
  edge_function_url := 'https://' || project_ref || '.supabase.co/functions/v1/send-inquiry-notification';

  -- Retrieve webhook secret from Supabase vault or fallback to database setting if configured
  -- Default secret header can also be verified by the Edge Function
  BEGIN
    SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets
    WHERE name = 'INQUIRY_WEBHOOK_SECRET'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    webhook_secret := NULL;
  END;

  -- Prepare standard Supabase Database Webhook INSERT payload
  request_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'sample_inquiries',
    'schema', 'public',
    'record', row_to_json(NEW)::jsonb,
    'old_record', NULL
  );

  -- Asynchronously dispatch via pg_net (non-blocking)
  PERFORM extensions.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', COALESCE(webhook_secret, '')
    ),
    body := request_payload,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Safeguard: Never fail or rollback the INSERT transaction if the webhook call fails
  RAISE WARNING '[notify_inquiry_created] Webhook dispatch encountered an error: %', SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_inquiry_created() IS
  'Asynchronously invokes the send-inquiry-notification Edge Function on inquiry insertion without blocking transactions.';

-- 3. Attach trigger to public.sample_inquiries
DROP TRIGGER IF EXISTS tr_notify_inquiry_created ON public.sample_inquiries;

CREATE TRIGGER tr_notify_inquiry_created
  AFTER INSERT ON public.sample_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_inquiry_created();

COMMENT ON TRIGGER tr_notify_inquiry_created ON public.sample_inquiries IS
  'Fires notify_inquiry_created() after each successful customer inquiry insertion.';

