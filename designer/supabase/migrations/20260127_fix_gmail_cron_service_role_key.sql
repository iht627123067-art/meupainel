-- Migration: 20260127_fix_gmail_cron_service_role_key.sql
-- Description: Fix Gmail sync cron job by removing broken service_role_key reference
-- 
-- Problem: The previous migration used current_setting('supabase.service_role_key')
-- which does NOT exist in Supabase's pg_cron context, causing all scheduled jobs to fail
-- with error: "unrecognized configuration parameter supabase.service_role_key"
--
-- Solution: Since trigger-gmail-sync has verify_jwt=false, we don't need Authorization header
-- The Edge Function uses SUPABASE_SERVICE_ROLE_KEY from its own environment variables

-- Step 1: Delete the broken cron jobs
SELECT cron.unschedule('gmail-sync-morning');
SELECT cron.unschedule('gmail-sync-evening');

-- Step 2: Create new cron jobs without Authorization header
-- (verify_jwt is disabled on trigger-gmail-sync, so auth is not required)

-- Schedule Gmail sync at 8:00 UTC (5:00 AM Brasília)  
SELECT cron.schedule(
    'gmail-sync-morning',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://peoyosdnthdpnhejivqo.supabase.co/functions/v1/trigger-gmail-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
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
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);
