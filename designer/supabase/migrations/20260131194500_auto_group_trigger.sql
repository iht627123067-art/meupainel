-- Migration: 20260131194500_auto_group_trigger.sql
-- Description: Automatically groups similar alerts on insertion.

-- 1. Trigger Function to call assignment
CREATE OR REPLACE FUNCTION public.trigger_assign_group()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run for Pending or valid items, and avoiding infinite loops if needed
    -- (Though this is AFTER INSERT, so update won't re-trigger it)
    PERFORM public.assign_or_create_group(
        NEW.id,
        NEW.title,
        NEW.clean_url
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_alert_insert_autn_group ON public.alerts;

CREATE TRIGGER on_alert_insert_auto_group
    AFTER INSERT ON public.alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_assign_group();
