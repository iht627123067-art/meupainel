-- Migration: 20260201010000_advanced_clustering.sql
-- Description: Implement Advanced Semantic Clustering using Weighted TF-IDF proxy and Time Decay.

-- 1. Create Stopwords Table (PT + EN + Generic)
CREATE TABLE IF NOT EXISTS public.custom_stopwords (
    word TEXT PRIMARY KEY
);

INSERT INTO public.custom_stopwords (word) VALUES 
('a'), ('o'), ('as'), ('os'), ('um'), ('uma'), ('uns'), ('umas'), ('de'), ('do'), ('da'), ('dos'), ('das'), 
('em'), ('no'), ('na'), ('nos'), ('nas'), ('por'), ('pelo'), ('pela'), ('pelos'), ('pelas'), ('para'), 
('com'), ('sem'), ('e'), ('ou'), ('se'), ('como'), ('mas'), ('que'), ('foi'), ('foram'), ('é'), ('são'), 
('ser'), ('estar'), ('ter'), ('haver'), ('sobre'), ('entre'), ('até'), ('após'), ('durante'),
('the'), ('of'), ('and'), ('in'), ('to'), ('for'), ('on'), ('with'), ('at'), ('by'), ('from'), ('up'), 
('about'), ('into'), ('over'), ('after'), ('is'), ('are'), ('was'), ('were'), ('be'), ('been'), ('being'),
('have'), ('has'), ('had'), ('do'), ('does'), ('did'), ('but'), ('if'), ('or'), ('because'), ('as'), 
('until'), ('while'), ('of'), ('at'), ('by'), ('for'), ('with'), ('about'), ('against'), ('between'), 
('into'), ('through'), ('during'), ('before'), ('after'), ('above'), ('below'), ('to'), ('from'), ('up'), 
('down'), ('in'), ('out'), ('on'), ('off'), ('over'), ('under'), ('again'), ('further'), ('then'), ('once'),
('here'), ('there'), ('when'), ('where'), ('why'), ('how'), ('all'), ('any'), ('both'), ('each'), ('few'), 
('more'), ('most'), ('other'), ('some'), ('such'), ('no'), ('nor'), ('not'), ('only'), ('own'), ('same'), 
('so'), ('than'), ('too'), ('very'), ('s'), ('t'), ('can'), ('will'), ('just'), ('don'), ('should'), ('now'),
('times'), ('union'), ('journal'), ('post'), ('news'), ('daily'), ('gazette'), ('herald'), ('tribune')
ON CONFLICT DO NOTHING;

-- 2. Function: Clean URL (Canonicalization)
CREATE OR REPLACE FUNCTION public.clean_url(p_url TEXT)
RETURNS TEXT AS $$
DECLARE
    v_url TEXT;
BEGIN
    IF p_url IS NULL THEN RETURN NULL; END IF;
    
    -- basic clean: lower, trim
    v_url := lower(trim(p_url));
    
    -- Remove query parameters (everything after ?)
    v_url := regexp_replace(v_url, '\?.*$', '');
    
    -- Remove protocol (http/https) and www for stricter comparison if needed?
    -- Actually, keeping protocol is fine, but usually we want to compare domain+path.
    -- Let's just strip trailing slash
    v_url := regexp_replace(v_url, '/+$', '');
    
    RETURN v_url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Function: Clean Title (Remove Source Suffixes)
CREATE OR REPLACE FUNCTION public.clean_title(p_title TEXT)
RETURNS TEXT AS $$
DECLARE
    v_title TEXT;
BEGIN
    IF p_title IS NULL THEN RETURN ''; END IF;
    
    v_title := p_title;
    
    -- Remove common source patterns like " - SourceName", " | SourceName"
    -- This regex looks for " - " or " | " followed by non-dash/pipe chars to the end
    v_title := regexp_replace(v_title, ' [\-\|] [^\-\|]+$', '');
    
    RETURN trim(v_title);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Function: Calculate Semantic Score (Weighted Jaccard + Time Decay)
CREATE OR REPLACE FUNCTION public.calculate_semantic_score(
    p_title_a TEXT,
    p_desc_a TEXT,
    p_date_a TIMESTAMPTZ,
    p_title_b TEXT,
    p_desc_b TEXT,
    p_date_b TIMESTAMPTZ
)
RETURNS FLOAT AS $$
DECLARE
    v_tokens_title_a TEXT[];
    v_tokens_title_b TEXT[];
    v_tokens_desc_a TEXT[];
    v_tokens_desc_b TEXT[];
    
    v_score_title FLOAT := 0;
    v_score_desc FLOAT := 0;
    v_raw_score FLOAT := 0;
    v_hours_diff FLOAT := 0;
    v_decay FLOAT := 0;
    
    v_intersect_cnt INT;
    v_union_cnt INT;
BEGIN
    -- 1. Parse tokens (Simple tokenization + Stopword filtering)
    -- We work on CLEANED titles (no source)
    
    -- Helper to get array of significant tokens (LOWERCASED for matching)
    -- Uses tsvector parser 'default' then filters against custom_stopwords table
    SELECT ARRAY(
        SELECT lower(token) FROM ts_parse('default', clean_title(p_title_a)) 
        WHERE tokid != 12 
        AND lower(token) NOT IN (SELECT word FROM public.custom_stopwords)
        AND length(token) > 2
    ) INTO v_tokens_title_a;

    SELECT ARRAY(
        SELECT lower(token) FROM ts_parse('default', clean_title(p_title_b)) 
        WHERE tokid != 12
        AND lower(token) NOT IN (SELECT word FROM public.custom_stopwords)
        AND length(token) > 2
    ) INTO v_tokens_title_b;

    -- Jaccard for Title
    -- (Intersection) / (Union)
    SELECT COUNT(*) INTO v_intersect_cnt
    FROM (
        SELECT unnest(v_tokens_title_a)
        INTERSECT
        SELECT unnest(v_tokens_title_b)
    ) t;

    SELECT COUNT(*) INTO v_union_cnt
    FROM (
        SELECT unnest(v_tokens_title_a)
        UNION
        SELECT unnest(v_tokens_title_b)
    ) t;

    IF v_union_cnt > 0 THEN
        v_score_title := v_intersect_cnt::FLOAT / v_union_cnt::FLOAT;
    ELSE
        v_score_title := 0;
    END IF;

    -- Jaccard for Description (Similar logic but less weight)
    -- Optimize: only do this if title score is promising (> 0.1) or always?
    -- Let's always do it for robustness
    SELECT ARRAY(
        SELECT lower(token) FROM ts_parse('default', p_desc_a) 
        WHERE tokid != 12
        AND lower(token) NOT IN (SELECT word FROM public.custom_stopwords)
        AND length(token) > 2
    ) INTO v_tokens_desc_a;

    SELECT ARRAY(
        SELECT lower(token) FROM ts_parse('default', p_desc_b) 
        WHERE tokid != 12
        AND lower(token) NOT IN (SELECT word FROM public.custom_stopwords)
        AND length(token) > 2
    ) INTO v_tokens_desc_b;

    SELECT COUNT(*) INTO v_intersect_cnt
    FROM (
        SELECT unnest(v_tokens_desc_a)
        INTERSECT
        SELECT unnest(v_tokens_desc_b)
    ) t;

    SELECT COUNT(*) INTO v_union_cnt
    FROM (
        SELECT unnest(v_tokens_desc_a)
        UNION
        SELECT unnest(v_tokens_desc_b)
    ) t;

    IF v_union_cnt > 0 THEN
        v_score_desc := v_intersect_cnt::FLOAT / v_union_cnt::FLOAT;
    ELSE
        v_score_desc := 0;
    END IF;
    
    -- 2. Weighted Raw Score
    -- 80% Title, 20% Description
    v_raw_score := (v_score_title * 0.8) + (v_score_desc * 0.2);
    
    -- 3. Time Decay
    -- 36h Half-life
    v_hours_diff := ABS(EXTRACT(EPOCH FROM (p_date_a - p_date_b)) / 3600.0);
    v_decay := 1.0 / (1.0 + (v_hours_diff / 36.0));
    
    RETURN v_raw_score * v_decay;
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Updated Function: Find or Create Duplicate Group
-- Used by the ingest process
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
    
    -- Cursor to iterate candidate items
    -- We limit lookback to 5 days to keep it fast, relying on time decay to handle the rest
    candidate_cursor CURSOR FOR 
        SELECT id, title, description, created_at, duplicate_group_id
        FROM public.alerts
        WHERE id != p_alert_id
        AND created_at > (now() - interval '5 days')
        AND created_at < p_created_at -- Look at older or same-time items
        ORDER BY created_at DESC;
        
    candidate RECORD;
BEGIN
    v_clean_url := public.clean_url(p_url);
    
    -- 1. Update the current item with its clean URL
    UPDATE public.alerts 
    SET clean_url = v_clean_url 
    WHERE id = p_alert_id;

    -- 2. EXACT MATCH CHECK (Canonical URL)
    -- If we find an exact URL match, it's a hard duplicate (same story, same source)
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

    -- 3. CLUSTERING CHECK (Semantic)
    OPEN candidate_cursor;
    LOOP
        FETCH candidate_cursor INTO candidate;
        EXIT WHEN NOT FOUND;
        
        -- Calculate score
        v_current_score := public.calculate_semantic_score(
            p_title, p_description, p_created_at,
            candidate.title, candidate.description, candidate.created_at
        );
        
        -- Threshold 0.15 (from simulation)
        IF v_current_score > 0.15 AND v_current_score > v_best_score THEN
            v_best_score := v_current_score;
            v_best_match_id := candidate.id;
            v_existing_group_id := candidate.duplicate_group_id;
        END IF;
    END LOOP;
    CLOSE candidate_cursor;

    -- 4. Assign Group
    IF v_best_match_id IS NOT NULL THEN
        -- If the best match already has a group, join it
        IF v_existing_group_id IS NOT NULL THEN
            UPDATE public.alerts 
            SET duplicate_group_id = v_existing_group_id, is_duplicate = true 
            WHERE id = p_alert_id;
            RETURN v_existing_group_id;
        ELSE
            -- Create NEW Group (leader is the older item usually, or we just make a new ID)
            v_existing_group_id := gen_random_uuid();
            
            -- Update the match
            UPDATE public.alerts 
            SET duplicate_group_id = v_existing_group_id 
            WHERE id = v_best_match_id;
            
            -- Update self
            UPDATE public.alerts 
            SET duplicate_group_id = v_existing_group_id, is_duplicate = true 
            WHERE id = p_alert_id;
            
            RETURN v_existing_group_id;
        END IF;
    END IF;

    -- No match found, no group assigned (it's a singleton)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
