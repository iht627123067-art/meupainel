-- Migration: 20260127_add_extraction_error_logging.sql
-- Description: Adds error_message column to extracted_content table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='extracted_content' AND column_name='error_message') THEN
        ALTER TABLE public.extracted_content ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Refresh constraints
ALTER TABLE public.extracted_content DROP CONSTRAINT IF EXISTS extracted_content_status_check;
ALTER TABLE public.extracted_content 
ADD CONSTRAINT extracted_content_status_check 
CHECK (extraction_status IN ('success', 'failed', 'pending', 'completed', 'processing'));
