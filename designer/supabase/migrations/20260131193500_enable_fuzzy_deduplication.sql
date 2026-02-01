-- Migration: 20260131193500_enable_fuzzy_deduplication.sql
-- Description: Enables pg_trgm for fuzzy search and adds deduplication logic.

-- 1. Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Add Trigram indexes for fast similarity search
CREATE INDEX IF NOT EXISTS idx_alerts_title_trgm ON public.alerts USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alerts_description_trgm ON public.alerts USING GIN (description gin_trgm_ops);

-- 3. Function to find duplicate group for a new item
CREATE OR REPLACE FUNCTION public.find_duplicate_group(
    p_title TEXT,
    p_clean_url TEXT,
    p_window_hours INT DEFAULT 72,
    p_similarity_threshold FLOAT DEFAULT 0.9
)
RETURNS UUID AS $$
DECLARE
    v_group_id UUID;
BEGIN
    -- 1. Check for exact Clean URL match first (strongest signal)
    IF p_clean_url IS NOT NULL THEN
        SELECT duplicate_group_id INTO v_group_id
        FROM public.alerts
        WHERE clean_url = p_clean_url
        LIMIT 1;

        IF v_group_id IS NOT NULL THEN
            RETURN v_group_id;
        END IF;
    END IF;

    -- 2. Check for Title Similarity
    SELECT duplicate_group_id INTO v_group_id
    FROM public.alerts
    WHERE 
        created_at > (now() - (p_window_hours || ' hours')::INTERVAL)
        AND similarity(title, p_title) > p_similarity_threshold
        AND duplicate_group_id IS NOT NULL
    ORDER BY similarity(title, p_title) DESC
    LIMIT 1;

    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to assign group or create new one
CREATE OR REPLACE FUNCTION public.assign_or_create_group(
    p_alert_id UUID,
    p_title TEXT,
    p_clean_url TEXT,
    p_window_hours INT DEFAULT 72,
    p_similarity_threshold FLOAT DEFAULT 0.8
)
RETURNS UUID AS $$
DECLARE
    v_existing_group_id UUID;
    v_similar_alert_id UUID;
BEGIN
    -- Check if this alert already has a group (idempotency)
    SELECT duplicate_group_id INTO v_existing_group_id FROM public.alerts WHERE id = p_alert_id;
    IF v_existing_group_id IS NOT NULL THEN
        RETURN v_existing_group_id;
    END IF;

    -- Look for existing GROUP
    v_existing_group_id := public.find_duplicate_group(p_title, p_clean_url, p_window_hours, p_similarity_threshold);
    
    IF v_existing_group_id IS NOT NULL THEN
        -- Add to existing group
        UPDATE public.alerts SET duplicate_group_id = v_existing_group_id, is_duplicate = true WHERE id = p_alert_id;
        RETURN v_existing_group_id;
    END IF;

    -- Look for similar ITEM that has no group yet
    SELECT id INTO v_similar_alert_id
    FROM public.alerts
    WHERE 
        id != p_alert_id
        AND created_at > (now() - (p_window_hours || ' hours')::INTERVAL)
        AND (
            similarity(title, p_title) > p_similarity_threshold
            OR (p_clean_url IS NOT NULL AND clean_url = p_clean_url)
        )
        AND duplicate_group_id IS NULL
    ORDER BY similarity(title, p_title) DESC
    LIMIT 1;

    IF v_similar_alert_id IS NOT NULL THEN
        -- Create NEW Group
        v_existing_group_id := gen_random_uuid();
        
        -- Update the other item
        UPDATE public.alerts SET duplicate_group_id = v_existing_group_id WHERE id = v_similar_alert_id;
        
        -- Update current item (mark as duplicate since it's the newer one)
        UPDATE public.alerts SET duplicate_group_id = v_existing_group_id, is_duplicate = true WHERE id = p_alert_id;
        
        RETURN v_existing_group_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
