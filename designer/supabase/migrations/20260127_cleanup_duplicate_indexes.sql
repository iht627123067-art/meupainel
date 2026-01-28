-- Migration: Cleanup duplicate indexes and fix remaining issues
-- Description: Remove duplicate indexes to improve performance

-- 1. Drop duplicate indexes on podcast_episodes
DROP INDEX IF EXISTS public.idx_podcast_user_id;
-- Keep: idx_podcast_episodes_user_id

-- 2. Drop duplicate indexes on user_article_interactions
DROP INDEX IF EXISTS public.idx_interactions_user_id;
DROP INDEX IF EXISTS public.idx_user_article_interactions_user_type;
-- Keep: idx_user_interactions_user_id, idx_user_interactions_user_type

-- 3. Drop duplicate indexes on user_content_dna
DROP INDEX IF EXISTS public.idx_user_dna_user_id;
-- Keep: idx_user_content_dna_user_id

-- 4. Verify cleanup
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for remaining duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT indexname, COUNT(*) as cnt
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY indexname
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still have % duplicate index names', duplicate_count;
  ELSE
    RAISE NOTICE 'All duplicate indexes cleaned up successfully';
  END IF;
END $$;
