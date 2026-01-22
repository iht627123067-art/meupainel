-- Migration: Gmail OAuth Tokens and Sync Logs
-- Date: 2026-01-21

-- ============================================
-- 1. Gmail OAuth Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS gmail_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(email_account_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_user ON gmail_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_expires ON gmail_oauth_tokens(token_expires_at);

-- RLS policies
ALTER TABLE gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON gmail_oauth_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON gmail_oauth_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON gmail_oauth_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON gmail_oauth_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. Email Sync Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
    emails_processed INT DEFAULT 0,
    articles_extracted INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_date ON email_sync_logs(email_account_id, sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON email_sync_logs(status) WHERE status = 'error';

-- RLS for sync logs (read-only for users)
ALTER TABLE email_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs" ON email_sync_logs
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM email_accounts WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 3. Update email_accounts table
-- ============================================
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS last_history_id TEXT;

-- ============================================
-- 4. Trigger to update updated_at on tokens
-- ============================================
CREATE OR REPLACE FUNCTION update_gmail_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gmail_token_updated ON gmail_oauth_tokens;
CREATE TRIGGER trigger_gmail_token_updated
    BEFORE UPDATE ON gmail_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_gmail_token_timestamp();

-- ============================================
-- 5. Function for service role to update tokens
-- ============================================
-- Allow Edge Functions with service_role to insert/update tokens
CREATE POLICY "Service role can manage all tokens" ON gmail_oauth_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON gmail_oauth_tokens TO service_role;
GRANT ALL ON email_sync_logs TO service_role;
