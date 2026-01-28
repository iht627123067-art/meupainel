-- Migration: Fix RLS on podcast_episodes table
-- Description: Enable Row Level Security and create proper policies for podcast_episodes

-- 1. Enable RLS on podcast_episodes
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any (cleanup)
DROP POLICY IF EXISTS "Users can view their own episodes" ON public.podcast_episodes;
DROP POLICY IF EXISTS "Users can insert their own episodes" ON public.podcast_episodes;
DROP POLICY IF EXISTS "Users can update their own episodes" ON public.podcast_episodes;
DROP POLICY IF EXISTS "Users can delete their own episodes" ON public.podcast_episodes;

-- 3. Create RLS policies
CREATE POLICY "Users can view their own episodes"
ON public.podcast_episodes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own episodes"
ON public.podcast_episodes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episodes"
ON public.podcast_episodes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episodes"
ON public.podcast_episodes FOR DELETE
USING (auth.uid() = user_id);

-- 4. Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'podcast_episodes') THEN
    RAISE EXCEPTION 'RLS not enabled on podcast_episodes table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on podcast_episodes with 4 policies';
END $$;
