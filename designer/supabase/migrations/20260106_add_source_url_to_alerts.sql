-- Add source_url column to alerts table
-- This will store the publisher's base URL extracted from RSS feed's <source url="..."> attribute

ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN alerts.source_url IS 'Publisher base URL extracted from RSS feed source element (e.g., https://www.reuters.com)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_alerts_source_url ON alerts(source_url) WHERE source_url IS NOT NULL;
