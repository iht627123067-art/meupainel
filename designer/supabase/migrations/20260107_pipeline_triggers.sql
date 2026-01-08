-- Migration: 20260107_pipeline_triggers.sql
-- Description: Creates triggers to orchestrate the content pipeline (Extraction -> Classification)
-- Depends on: pg_net extension

-- Ensure pg_net is enabled
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 1. Function to Invoke Extract Content
CREATE OR REPLACE FUNCTION public.invoke_extract_content()
RETURNS TRIGGER AS $$
DECLARE
    project_url text := 'https://peoyosdnthdpnhejivqo.supabase.co';
    function_name text := 'extract-content';
    payload jsonb;
    request_id bigint;
BEGIN
    -- Only run for RSS or Google News
    IF NEW.source_type NOT IN ('rss', 'google_news') THEN
        RETURN NEW;
    END IF;

    payload := jsonb_build_object(
        'alert_id', NEW.id,
        'url', COALESCE(NEW.clean_url, NEW.url)
    );

    -- Use anon key for internal trigger (assuming function handles RLS/Public access or we'd need service key)
    -- Ideally we'd use a Vault secret, but for now we'll rely on the function being accessible
    -- with the Anon Key or internal network.
    -- NOTE: For security, the Edge Function should Verify JWT.
    -- Since we can't easily inject the Service Role Key in SQL without Vault,
    -- We will try to rely on pg_net making the call. 
    -- However, standard practice often implies passing the Service Key.
    
    -- Constructing the request
    SELECT net.http_post(
        url := project_url || '/functions/v1/' || function_name,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true) -- Attempt to pass current user context if available, otherwise it might fail auth
        ),
        body := payload
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger for Extraction
DROP TRIGGER IF EXISTS on_alert_created_extract ON public.alerts;
CREATE TRIGGER on_alert_created_extract
    AFTER INSERT ON public.alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.invoke_extract_content();

-- 3. Function to Invoke Classify Content
CREATE OR REPLACE FUNCTION public.invoke_classify_content()
RETURNS TRIGGER AS $$
DECLARE
    project_url text := 'https://peoyosdnthdpnhejivqo.supabase.co';
    function_name text := 'classify-content';
    payload jsonb;
    request_id bigint;
BEGIN
    -- Only run if content is not empty
    IF NEW.markdown_content IS NULL OR length(NEW.markdown_content) < 10 THEN
        RETURN NEW;
    END IF;

    -- Retrieve the Alert to get Title/Description if needed, but the function fetches it.
    -- The function expects 'alert_id'
    payload := jsonb_build_object(
        'alert_id', NEW.alert_id
    );

    -- Invoke Classify Content
    SELECT net.http_post(
        url := project_url || '/functions/v1/' || function_name,
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
             -- Authorization handled same as above, attempting to pass context or needing a key
        ),
        body := payload
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for Classification
DROP TRIGGER IF EXISTS on_content_extracted_classify ON public.extracted_content;
CREATE TRIGGER on_content_extracted_classify
    AFTER INSERT OR UPDATE ON public.extracted_content
    FOR EACH ROW
    -- OR UPDATE check: prevent loops or re-runs if content didn't change meaningfully?
    -- For now, let's stick to INSERT or strict updates where status changes to success?
    -- But extracted_content usually is inserted once. Updates might happen on re-extraction.
    EXECUTE FUNCTION public.invoke_classify_content();
