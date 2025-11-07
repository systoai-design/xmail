-- Fix function search path for security
DROP FUNCTION IF EXISTS validate_scheduled_for() CASCADE;

CREATE OR REPLACE FUNCTION validate_scheduled_for()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scheduled_for <= NOW() THEN
        RAISE EXCEPTION 'Scheduled time must be in the future';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_scheduled_for_before_insert
    BEFORE INSERT ON public.scheduled_emails
    FOR EACH ROW
    EXECUTE FUNCTION validate_scheduled_for();