-- Migration: 20260131200000_check_duplicates_rpc.sql
-- Description: RPC function to check for existing articles by URL or fuzzy title.

CREATE OR REPLACE FUNCTION public.check_existing_articles(
    p_entries JSONB, -- Array of objects: { clean_url: text, title: text }
    p_similarity_threshold FLOAT DEFAULT 0.9,
    p_window_hours INT DEFAULT 168 -- Check last 7 days by default
)
RETURNS TABLE (
    match_url TEXT,
    match_title TEXT,
    is_duplicate BOOLEAN,
    existing_id UUID
) AS $$
DECLARE
    item JSONB;
    v_clean_url TEXT;
    v_title TEXT;
    v_existing_id UUID;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_clean_url := item->>'clean_url';
        v_title := item->>'title';
        v_existing_id := NULL;

        -- 1. Check exact Clean URL
        IF v_clean_url IS NOT NULL THEN
            SELECT id INTO v_existing_id
            FROM public.alerts
            WHERE clean_url = v_clean_url
            LIMIT 1;
        END IF;

        -- 2. Check Title Similarity if not found
        IF v_existing_id IS NULL AND v_title IS NOT NULL THEN
            SELECT id INTO v_existing_id
            FROM public.alerts
            WHERE 
                created_at > (now() - (p_window_hours || ' hours')::INTERVAL)
                AND similarity(title, v_title) > p_similarity_threshold
            ORDER BY similarity(title, v_title) DESC
            LIMIT 1;
        END IF;

        IF v_existing_id IS NOT NULL THEN
            match_url := v_clean_url;
            match_title := v_title;
            is_duplicate := TRUE;
            existing_id := v_existing_id;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
