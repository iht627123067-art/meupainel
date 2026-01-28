-- Description: Schema for Personalized Podcast with Reinforcement Learning and Content DNA

-- 0. Update alert_status enum
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'duplicate';

-- 1. Create User Content DNA table
CREATE TABLE IF NOT EXISTS public.user_content_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Explicit Preferences
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_tone VARCHAR(50) DEFAULT 'profissional',
  preferred_topics TEXT[] DEFAULT '{}',
  
  -- Engagement History (calculated)
  published_categories JSONB DEFAULT '{}',  -- e.g. {"AI": 15, "Tech": 8}
  archived_categories JSONB DEFAULT '{}',   -- e.g. {"Politics": 3}
  avg_confidence_threshold NUMERIC DEFAULT 0.7,
  avg_word_count_preference INT DEFAULT 500,
  
  -- Behavior metrics
  total_published INT DEFAULT 0,
  total_archived INT DEFAULT 0,
  total_podcasts_generated INT DEFAULT 0,
  
  -- Profile maturity
  dna_score NUMERIC DEFAULT 0.5,  -- 0 to 1
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_content_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own DNA"
ON public.user_content_dna FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own DNA"
ON public.user_content_dna FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_dna_user_id ON public.user_content_dna(user_id);

-- 2. Create User Article Interactions table (Implicit Feedback)
CREATE TABLE IF NOT EXISTS public.user_article_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  
  -- Interaction Type
  interaction_type VARCHAR(50) NOT NULL, 
    -- 'published_linkedin', 'archived', 'used_in_research', 
    -- 'included_in_podcast', 'manually_approved', 'manually_rejected'
  
  -- Context captured at time of interaction
  article_category VARCHAR(100),
  article_confidence NUMERIC,
  article_word_count INT,
  
  interacted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, alert_id, interaction_type)
);

ALTER TABLE public.user_article_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interactions"
ON public.user_article_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON public.user_article_interactions(user_id);

-- 3. Modify Alerts table
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS personalization_score NUMERIC,
ADD COLUMN IF NOT EXISTS linkedin_rationale TEXT,
ADD COLUMN IF NOT EXISTS research_rationale TEXT;

-- 4. Modify Podcast Episodes table
-- First check if table exists (it should based on previous skills)
CREATE TABLE IF NOT EXISTS public.podcast_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    episode_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    description TEXT,
    script_markdown TEXT NOT NULL,
    article_ids UUID[] DEFAULT '{}',
    total_articles INT DEFAULT 0,
    estimated_duration_minutes INT,
    quality_score NUMERIC,
    notebooklm_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, episode_date)
);

ALTER TABLE public.podcast_episodes
ADD COLUMN IF NOT EXISTS user_personalization_score NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS dna_snapshot JSONB,
ADD COLUMN IF NOT EXISTS personalized_reasoning JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_feedback VARCHAR(50); -- 'liked', 'disliked', 'used'

-- 5. FUNCTION: Calculate Personalized Score
CREATE OR REPLACE FUNCTION public.calculate_personalized_score(
  p_user_id UUID,
  p_alert_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_score NUMERIC;
  v_dna_bonus NUMERIC := 0;
  v_final_score NUMERIC;
  v_article_category TEXT;
  v_user_dna RECORD;
BEGIN
  -- 1. Get user DNA
  SELECT * INTO v_user_dna
  FROM public.user_content_dna
  WHERE user_id = p_user_id;
  
  -- If no DNA yet, return a normalized base score
  IF NOT FOUND THEN
    -- Fallback base selection logic
    SELECT 
      COALESCE(ac.confidence_score, 0) * 0.4 +
      LEAST(ec.word_count / 1000.0, 1.0) * 0.3 +
      CASE WHEN ec.quality_score > 0.7 THEN 0.3 ELSE 0 END
    INTO v_base_score
    FROM public.alerts a
    LEFT JOIN public.ai_classifications ac ON ac.alert_id = a.id
    LEFT JOIN public.extracted_content ec ON ec.alert_id = a.id
    WHERE a.id = p_alert_id;
    
    RETURN COALESCE(v_base_score, 0.5);
  END IF;
  
  -- 2. Get base article score
  SELECT 
    COALESCE(ac.confidence_score, 0) * 0.4 +
    LEAST(ec.word_count / 1000.0, 1.0) * 0.3 +
    CASE WHEN ec.quality_score > 0.7 THEN 0.3 ELSE 0 END
  INTO v_base_score
  FROM public.alerts a
  LEFT JOIN public.ai_classifications ac ON ac.alert_id = a.id
  LEFT JOIN public.extracted_content ec ON ec.alert_id = a.id
  WHERE a.id = p_alert_id;
  
  -- 3. Get article category
  SELECT COALESCE(ac.category, 'Uncategorized') INTO v_article_category
  FROM public.ai_classifications ac
  WHERE ac.alert_id = p_alert_id;
  
  -- 4. Calculate DNA bonuses
  -- Preference bonus
  IF v_article_category = ANY(v_user_dna.preferred_categories) THEN
    v_dna_bonus := v_dna_bonus + 0.2;
  END IF;
  
  -- Content History bonus
  IF (v_user_dna.published_categories->>v_article_category)::INT > 5 THEN
    v_dna_bonus := v_dna_bonus + 0.15;
  END IF;
  
  -- Avoidance penalty
  IF (v_user_dna.archived_categories->>v_article_category)::INT > 3 THEN
    v_dna_bonus := v_dna_bonus - 0.2;
  END IF;
  
  -- 5. Final Score (Bounded 0-1)
  v_final_score := LEAST(1.0, GREATEST(0.0, COALESCE(v_base_score, 0.5) + v_dna_bonus));
  
  RETURN v_final_score;
END;
$$;

-- 6. FUNCTION: Get Personalized Articles
CREATE OR REPLACE FUNCTION public.get_personalized_articles_for_podcast(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_min_articles INT DEFAULT 3,
  p_max_articles INT DEFAULT 10
) RETURNS TABLE(
  alert_id UUID,
  title TEXT,
  publisher TEXT,
  content TEXT,
  category TEXT,
  personalized_score NUMERIC,
  linkedin_rationale TEXT,
  research_rationale TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH scored_articles AS (
    SELECT 
      a.id as alert_id,
      a.title,
      a.publisher,
      ec.cleaned_content as content,
      ac.category,
      public.calculate_personalized_score(p_user_id, a.id) as p_score,
      a.linkedin_rationale,
      a.research_rationale
    FROM public.alerts a
    INNER JOIN public.extracted_content ec ON ec.alert_id = a.id
    LEFT JOIN public.ai_classifications ac ON ac.alert_id = a.id
    WHERE a.created_at::date = p_date
      AND a.user_id = p_user_id
      AND a.status NOT IN ('duplicate', 'archived')
      AND ec.word_count >= 100
    ORDER BY p_score DESC
    LIMIT p_max_articles
  )
  SELECT * FROM scored_articles
  WHERE (SELECT COUNT(*) FROM scored_articles) >= p_min_articles;
END;
$$;

-- 7. TRIGGER FUNCTION: Track User Interaction
CREATE OR REPLACE FUNCTION public.track_user_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_interaction_type VARCHAR(50);
  v_category TEXT;
  v_confidence NUMERIC;
  v_word_count INT;
BEGIN
  -- Determine interaction type
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    v_interaction_type := 'published_linkedin';
  ELSIF NEW.status = 'archived' AND OLD.status != 'archived' THEN
    v_interaction_type := 'archived';
  ELSIF NEW.status = 'approved' AND OLD.status = 'classified' THEN
    v_interaction_type := 'manually_approved';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Get article metadata
  SELECT ac.category, ac.confidence_score INTO v_category, v_confidence
  FROM public.ai_classifications ac
  WHERE ac.alert_id = NEW.id;
  
  SELECT ec.word_count INTO v_word_count
  FROM public.extracted_content ec
  WHERE ec.alert_id = NEW.id;
  
  -- Insert interaction record
  INSERT INTO public.user_article_interactions (
    user_id,
    alert_id,
    interaction_type,
    article_category,
    article_confidence,
    article_word_count
  ) VALUES (
    NEW.user_id,
    NEW.id,
    v_interaction_type,
    v_category,
    v_confidence,
    v_word_count
  )
  ON CONFLICT (user_id, alert_id, interaction_type) DO NOTHING;
  
  -- Trigger DNA recalculation (Async via pg_net)
  PERFORM net.http_post(
    url := current_setting('supabase.url') || '/functions/v1/calculate-user-dna',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- 8. CREATE TRIGGER
DROP TRIGGER IF EXISTS on_alert_status_change ON public.alerts;
CREATE TRIGGER on_alert_status_change
AFTER UPDATE OF status ON public.alerts
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.track_user_interaction();
