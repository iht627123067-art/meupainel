-- Migration: Gmail Cron Job for Daily Sync
-- Date: 2026-01-21

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily Gmail sync at 06:00 UTC
-- Can be adjusted via: SELECT cron.alter_job(job_id, schedule => 'new_schedule');
SELECT cron.schedule(
    'daily-gmail-sync',           -- job name
    '0 6 * * *',                  -- cron expression: 6 AM UTC daily
    $$
    SELECT net.http_post(
        url := current_setting('supabase.url') || '/functions/v1/trigger-gmail-sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Also schedule a second sync at 18:00 UTC (for better coverage)
SELECT cron.schedule(
    'evening-gmail-sync',         -- job name
    '0 18 * * *',                 -- cron expression: 6 PM UTC daily
    $$
    SELECT net.http_post(
        url := current_setting('supabase.url') || '/functions/v1/trigger-gmail-sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Grant cron schema access
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
