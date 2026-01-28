-- Description: Fix RLS policies and improve podcast article selection logic

-- 1. Fix RLS Policies for DNA and Interactions tables
-- Allow users to insert their own DNA records
DROP POLICY IF EXISTS "Users can insert their own DNA" ON public.user_content_dna;
CREATE POLICY "Users can insert their own DNA"
ON public.user_content_dna FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own interactions
DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.user_article_interactions;
CREATE POLICY "Users can insert their own interactions"
ON public.user_article_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Update get_personalized_articles_for_podcast to look back N days
CREATE OR REPLACE FUNCTION public.get_personalized_articles_for_podcast(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_min_articles INT DEFAULT 3,
  p_max_articles INT DEFAULT 10,
  p_lookback_days INT DEFAULT 7
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
    WHERE 
      -- Look back p_lookback_days from p_date
      a.created_at >= (p_date - (p_lookback_days || ' days')::interval)
      AND a.created_at <= (p_date + interval '1 day')
      AND a.user_id = p_user_id
      AND a.status NOT IN ('duplicate', 'archived', 'rejected')
      -- Prioritize classified or approved items, but allow others if needed
      AND (a.status IN ('classified', 'approved', 'published') OR a.status = 'extracted')
      AND ec.word_count >= 100
    ORDER BY p_score DESC
    LIMIT p_max_articles
  )
  SELECT * FROM scored_articles
  -- Ensure we have enough articles, otherwise return what we have
  -- (Logic handled in Edge Function for strictness)
  LIMIT p_max_articles;
END;
$$;
