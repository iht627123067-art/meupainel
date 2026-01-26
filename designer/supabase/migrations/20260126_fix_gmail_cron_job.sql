-- Migration: 20260126_fix_gmail_cron_job.sql
-- Description: Fix Gmail sync cron job with correct URL and authentication
-- Fixes: Incorrect hardcoded URL and missing service_role_key configuration

-- Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Delete old/incorrect jobs if they exist
DO $$
BEGIN
    -- Delete all existing Gmail sync jobs
    PERFORM cron.unschedule(jobname) 
    FROM cron.job 
    WHERE jobname IN ('daily-gmail-sync', 'evening-gmail-sync', 'daily-gmail-sync-v2');
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if jobs don't exist
        NULL;
END $$;

-- Schedule Gmail sync at 8:00 UTC (5:00 AM Brasília)
SELECT cron.schedule(
    'gmail-sync-morning',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://peoyosdnthdpnhejivqo.supabase.co/functions/v1/trigger-gmail-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Schedule Gmail sync at 18:00 UTC (3:00 PM Brasília)
SELECT cron.schedule(
    'gmail-sync-evening',
    '0 18 * * *',
    $$
    SELECT net.http_post(
        url := 'https://peoyosdnthdpnhejivqo.supabase.co/functions/v1/trigger-gmail-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Verify jobs were created
DO $$
DECLARE
    job_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO job_count
    FROM cron.job
    WHERE jobname IN ('gmail-sync-morning', 'gmail-sync-evening');
    
    IF job_count = 2 THEN
        RAISE NOTICE 'Gmail sync cron jobs created successfully: gmail-sync-morning (8:00 UTC), gmail-sync-evening (18:00 UTC)';
    ELSE
        RAISE WARNING 'Expected 2 Gmail sync jobs but found %', job_count;
    END IF;
END $$;
