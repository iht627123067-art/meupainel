-- Migration: Add missing indexes for performance optimization
-- Description: Create indexes on foreign keys and frequently queried columns

-- 1. Indexes for podcast_episodes table
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_user_id 
ON public.podcast_episodes(user_id);

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_created_at 
ON public.podcast_episodes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_status 
ON public.podcast_episodes(status);

-- 2. Indexes for user_article_interactions table
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id 
ON public.user_article_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_interactions_alert_id 
ON public.user_article_interactions(alert_id);

CREATE INDEX IF NOT EXISTS idx_user_interactions_type 
ON public.user_article_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at 
ON public.user_article_interactions(created_at DESC);

-- 3. Indexes for user_content_dna table
CREATE INDEX IF NOT EXISTS idx_user_content_dna_user_id 
ON public.user_content_dna(user_id);

CREATE INDEX IF NOT EXISTS idx_user_content_dna_updated_at 
ON public.user_content_dna(last_updated_at DESC);

-- 4. Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_user_status 
ON public.podcast_episodes(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type 
ON public.user_article_interactions(user_id, interaction_type);

-- 5. Verify indexes were created
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Total custom indexes created: %', index_count;
END $$;
