-- Migration: Performance Improvements
-- Description: Add indexes for foreign keys and optimize RLS policies
-- Date: 2026-01-02

-- ====================================
-- PART 1: Add indexes for foreign keys
-- ====================================

-- Index for ai_classifications.alert_id
CREATE INDEX IF NOT EXISTS idx_ai_classifications_alert_id 
ON ai_classifications(alert_id);

-- Index for alerts.email_account_id
CREATE INDEX IF NOT EXISTS idx_alerts_email_account_id 
ON alerts(email_account_id);

-- Index for alerts.rss_feed_id
CREATE INDEX IF NOT EXISTS idx_alerts_rss_feed_id 
ON alerts(rss_feed_id);

-- Index for extracted_content.alert_id
CREATE INDEX IF NOT EXISTS idx_extracted_content_alert_id 
ON extracted_content(alert_id);

-- Index for linkedin_posts.alert_id
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_alert_id 
ON linkedin_posts(alert_id);

-- Index for research_materials.alert_id
CREATE INDEX IF NOT EXISTS idx_research_materials_alert_id 
ON research_materials(alert_id);

-- ====================================
-- PART 2: Optimize RLS Policies
-- ====================================
-- Replace auth.uid() with (select auth.uid()) to avoid InitPlan performance issue

-- ========== email_accounts ==========
DROP POLICY IF EXISTS "Users can view their email accounts" ON email_accounts;
CREATE POLICY "Users can view their email accounts" ON email_accounts
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their email accounts" ON email_accounts;
CREATE POLICY "Users can insert their email accounts" ON email_accounts
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their email accounts" ON email_accounts;
CREATE POLICY "Users can update their email accounts" ON email_accounts
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their email accounts" ON email_accounts;
CREATE POLICY "Users can delete their email accounts" ON email_accounts
  FOR DELETE USING (user_id = (select auth.uid()));

-- ========== rss_feeds ==========
DROP POLICY IF EXISTS "Users can view their rss feeds" ON rss_feeds;
CREATE POLICY "Users can view their rss feeds" ON rss_feeds
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their rss feeds" ON rss_feeds;
CREATE POLICY "Users can insert their rss feeds" ON rss_feeds
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their rss feeds" ON rss_feeds;
CREATE POLICY "Users can update their rss feeds" ON rss_feeds
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their rss feeds" ON rss_feeds;
CREATE POLICY "Users can delete their rss feeds" ON rss_feeds
  FOR DELETE USING (user_id = (select auth.uid()));

-- ========== alerts ==========
DROP POLICY IF EXISTS "Users can view their alerts" ON alerts;
CREATE POLICY "Users can view their alerts" ON alerts
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their alerts" ON alerts;
CREATE POLICY "Users can insert their alerts" ON alerts
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their alerts" ON alerts;
CREATE POLICY "Users can update their alerts" ON alerts
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their alerts" ON alerts;
CREATE POLICY "Users can delete their alerts" ON alerts
  FOR DELETE USING (user_id = (select auth.uid()));

-- ========== extracted_content ==========
-- Note: extracted_content doesn't have user_id, it relies on JOIN with alerts table for RLS
DROP POLICY IF EXISTS "Users can view extracted content" ON extracted_content;
CREATE POLICY "Users can view extracted content" ON extracted_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alerts 
      WHERE alerts.id = extracted_content.alert_id 
      AND alerts.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage extracted content" ON extracted_content;
CREATE POLICY "Users can manage extracted content" ON extracted_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alerts 
      WHERE alerts.id = extracted_content.alert_id 
      AND alerts.user_id = (select auth.uid())
    )
  );

-- ========== ai_classifications ==========
-- Note: ai_classifications doesn't have user_id, it relies on JOIN with alerts table for RLS
DROP POLICY IF EXISTS "Users can view ai classifications" ON ai_classifications;
CREATE POLICY "Users can view ai classifications" ON ai_classifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alerts 
      WHERE alerts.id = ai_classifications.alert_id 
      AND alerts.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage ai classifications" ON ai_classifications;
CREATE POLICY "Users can manage ai classifications" ON ai_classifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alerts 
      WHERE alerts.id = ai_classifications.alert_id 
      AND alerts.user_id = (select auth.uid())
    )
  );

-- ========== linkedin_posts ==========
DROP POLICY IF EXISTS "Users can view their linkedin posts" ON linkedin_posts;
CREATE POLICY "Users can view their linkedin posts" ON linkedin_posts
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their linkedin posts" ON linkedin_posts;
CREATE POLICY "Users can insert their linkedin posts" ON linkedin_posts
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their linkedin posts" ON linkedin_posts;
CREATE POLICY "Users can update their linkedin posts" ON linkedin_posts
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their linkedin posts" ON linkedin_posts;
CREATE POLICY "Users can delete their linkedin posts" ON linkedin_posts
  FOR DELETE USING (user_id = (select auth.uid()));

-- ========== research_materials ==========
DROP POLICY IF EXISTS "Users can view their research materials" ON research_materials;
CREATE POLICY "Users can view their research materials" ON research_materials
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their research materials" ON research_materials;
CREATE POLICY "Users can insert their research materials" ON research_materials
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their research materials" ON research_materials;
CREATE POLICY "Users can update their research materials" ON research_materials
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their research materials" ON research_materials;
CREATE POLICY "Users can delete their research materials" ON research_materials
  FOR DELETE USING (user_id = (select auth.uid()));

-- ====================================
-- PART 3: Add helpful comments
-- ====================================

COMMENT ON INDEX idx_ai_classifications_alert_id IS 'Performance: Index for foreign key ai_classifications.alert_id';
COMMENT ON INDEX idx_alerts_email_account_id IS 'Performance: Index for foreign key alerts.email_account_id';
COMMENT ON INDEX idx_alerts_rss_feed_id IS 'Performance: Index for foreign key alerts.rss_feed_id';
COMMENT ON INDEX idx_extracted_content_alert_id IS 'Performance: Index for foreign key extracted_content.alert_id';
COMMENT ON INDEX idx_linkedin_posts_alert_id IS 'Performance: Index for foreign key linkedin_posts.alert_id';
COMMENT ON INDEX idx_research_materials_alert_id IS 'Performance: Index for foreign key research_materials.alert_id';
