-- Migration: 20260201010500_fix_clean_url_and_constraint.sql
-- Description: Fix clean_url to handle Google Redirects and drop unique constraint to allow clustering.

-- 1. Drop the Unique Constraint on clean_url
-- We want to allow storing duplicate alerts (e.g. from different email imports) and cluster them via duplicate_group_id
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_clean_url_key;

-- 2. Improved clean_url function
CREATE OR REPLACE FUNCTION public.clean_url(p_url TEXT)
RETURNS TEXT AS $$
DECLARE
    v_url TEXT := p_url;
    v_extracted TEXT;
BEGIN
    IF p_url IS NULL THEN RETURN NULL; END IF;
    
    -- Handle Google Redirects
    -- https://www.google.com/url?q=REAL_URL&...
    IF v_url ~* 'google\.com/url\?' THEN
        -- Extract q= parameter
        v_extracted := substring(v_url FROM 'q=([^&]+)');
        IF v_extracted IS NOT NULL THEN
            v_url := v_extracted; 
        ELSE
            -- Try 'url=' parameter
            v_extracted := substring(v_url FROM 'url=([^&]+)');
            IF v_extracted IS NOT NULL THEN
                v_url := v_extracted;
            END IF;
        END IF;
    END IF;

    -- Now proceed with cleaning
    v_url := lower(trim(v_url));
    v_url := regexp_replace(v_url, '\?.*$', '');
    v_url := regexp_replace(v_url, '/+$', '');
    
    -- decode common encoded chars (primitive decoding)
    v_url := replace(v_url, '%3a', ':');
    v_url := replace(v_url, '%3A', ':');
    v_url := replace(v_url, '%2f', '/');
    v_url := replace(v_url, '%2F', '/');
    
    RETURN v_url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
