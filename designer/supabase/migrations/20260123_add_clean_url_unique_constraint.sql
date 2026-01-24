-- Add unique constraint on clean_url for deduplication
-- This allows upsert operations to prevent duplicate articles

-- First, let's handle any pre-existing duplicates by keeping the oldest
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

-- Now create the unique index
CREATE UNIQUE INDEX idx_alerts_clean_url_unique 
ON public.alerts(clean_url) 
WHERE clean_url IS NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX public.idx_alerts_clean_url_unique IS 
'Ensures no duplicate articles are inserted based on cleaned URL. Supports UPSERT operations.';
