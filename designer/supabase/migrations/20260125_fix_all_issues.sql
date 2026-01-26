-- Migration: 20260125_fix_all_issues.sql
-- Description: Consolidates pending fixes for security, performance, and schema consistency.

-- ============================================================
-- 1. SECURITY FIXES (Search Path & RLS)
-- ============================================================

-- Fix: Function Search Path Mutable
ALTER FUNCTION public.invoke_extract_content() SET search_path = 'public';
ALTER FUNCTION public.invoke_classify_content() SET search_path = 'public';
-- Check if update_gmail_token_timestamp exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_gmail_token_timestamp') THEN
        ALTER FUNCTION public.update_gmail_token_timestamp() SET search_path = 'public';
    END IF;
END $$;

-- Fix: Permissive RLS on gmail_oauth_tokens
-- Drop the permissive policy if it exists
DROP POLICY IF EXISTS "Service role can manage all tokens" ON public.gmail_oauth_tokens;

-- Create a safer policy for Service Role (although Service Role bypasses RLS anyway, explicitly explicit is fine)
-- Actually, Service Role bypass RLS by default, so we don't strictly need a policy for it unless we use a non-bypass role.
-- But let's define it correctly if we want to be explicit, but usually we just rely on bypass.
-- If the previous policy was created, it might have been to allow some "anon" access wrapped as service?
-- No, the name was "Service role...". Best practice: Don't add policies for Service Role, just let it bypass.
-- However, if we need to ensure no one else can access, we should ensure only user policies exist.

-- ============================================================
-- 2. PERFORMANCE FIXES (Indexes)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_classification_id ON public.linkedin_posts(classification_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_user_id ON public.linkedin_posts(user_id);

-- Cleanup Duplicate RLS on rss_feeds
DROP POLICY IF EXISTS "Users can view their rss feeds" ON public.rss_feeds;
DROP POLICY IF EXISTS "Users can update their rss feeds" ON public.rss_feeds;
-- Keep "Users can view their own rss feeds" and "Users can update their own rss feeds" if they serve the purpose.
-- Ensure we have at least one valid policy.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rss_feeds' AND policyname = 'Users can view their own rss feeds') THEN
        CREATE POLICY "Users can view their own rss feeds" ON public.rss_feeds FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rss_feeds' AND policyname = 'Users can update their own rss feeds') THEN
        CREATE POLICY "Users can update their own rss feeds" ON public.rss_feeds FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================
-- 3. SCHEMA CONSISTENCY & CRITICAL CONSTRAINTS
-- ============================================================

-- From: 20260123_add_clean_url_unique_constraint.sql
-- Deduplicate alerts before adding constraint
WITH duplicates AS (
    SELECT id, clean_url, created_at,
           ROW_NUMBER() OVER (PARTITION BY clean_url ORDER BY created_at ASC) as rn
    FROM public.alerts
    WHERE clean_url IS NOT NULL
)
DELETE FROM public.alerts
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_clean_url_unique 
ON public.alerts(clean_url) 
WHERE clean_url IS NOT NULL;

-- From: 20260124_advanced_linkedin_schema.sql
ALTER TABLE public.linkedin_posts 
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
