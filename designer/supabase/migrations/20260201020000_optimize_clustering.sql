-- Migration: 20260201020000_optimize_clustering.sql
-- Description: Optimize clustering performance by using Trigram Index pre-filtering.

-- Optimize the function to use the Trigram Index filter (%) BEFORE calculating the heavy semantic score
CREATE OR REPLACE FUNCTION public.assign_or_create_group_v2(
    p_alert_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_url TEXT,
    p_created_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
    v_clean_url TEXT;
    v_existing_group_id UUID;
    v_best_match_id UUID;
    v_best_score FLOAT := 0;
    v_current_score FLOAT;
    
    candidate RECORD;
BEGIN
    -- 0. Set local similarity threshold for the % operator
    -- We lower it to 0.1 because we want to catch "loosely similar" items first
    -- and then let our Semantic Score (TF-IDF) decide the real match.
    -- Default is usually 0.3, which might miss "Entity-only" matches.
    PERFORM set_config('pg_trgm.similarity_threshold', '0.1', true);

    v_clean_url := public.clean_url(p_url);
    
    -- 1. Update the current item with its clean URL
    UPDATE public.alerts 
    SET clean_url = v_clean_url 
    WHERE id = p_alert_id;

    -- 2. EXACT MATCH CHECK (Canonical URL)
    SELECT duplicate_group_id INTO v_existing_group_id
    FROM public.alerts
    WHERE clean_url = v_clean_url
    AND id != p_alert_id
    LIMIT 1;
    
    IF v_existing_group_id IS NOT NULL THEN
        UPDATE public.alerts 
        SET duplicate_group_id = v_existing_group_id, is_duplicate = true 
        WHERE id = p_alert_id;
        RETURN v_existing_group_id;
    END IF;

    -- 3. CLUSTERING CHECK (Semantic with Index Optimization)
    -- We replaced the CURSOR with a FOR loop that uses the % operator
    -- This forces Postgres to use the GIN index on 'title'
    FOR candidate IN 
        SELECT id, title, description, created_at, duplicate_group_id
        FROM public.alerts
        WHERE id != p_alert_id
        AND created_at > (now() - interval '5 days')
        AND created_at < p_created_at
        AND title % p_title -- <--- KEY OPTIMIZATION: Uses Index Scan
        ORDER BY created_at DESC
        LIMIT 20 -- Safety limit, usually index returns few results anyway
    LOOP
        -- Calculate score (Heavy Math)
        v_current_score := public.calculate_semantic_score(
            p_title, p_description, p_created_at,
            candidate.title, candidate.description, candidate.created_at
        );
        
        -- Threshold 0.15
        IF v_current_score > 0.15 AND v_current_score > v_best_score THEN
            v_best_score := v_current_score;
            v_best_match_id := candidate.id;
            v_existing_group_id := candidate.duplicate_group_id;
        END IF;
    END LOOP;

    -- 4. Assign Group
    IF v_best_match_id IS NOT NULL THEN
        IF v_existing_group_id IS NOT NULL THEN
            UPDATE public.alerts 
            SET duplicate_group_id = v_existing_group_id, is_duplicate = true 
            WHERE id = p_alert_id;
            RETURN v_existing_group_id;
        ELSE
            v_existing_group_id := gen_random_uuid();
            
            UPDATE public.alerts 
            SET duplicate_group_id = v_existing_group_id 
            WHERE id = v_best_match_id;
            
            UPDATE public.alerts 
            SET duplicate_group_id = v_existing_group_id, is_duplicate = true 
            WHERE id = p_alert_id;
            
            RETURN v_existing_group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
