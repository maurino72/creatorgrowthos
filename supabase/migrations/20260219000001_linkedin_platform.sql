-- LinkedIn platform support
-- If platform_type enum exists, add 'linkedin' value (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
    BEGIN
      ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'linkedin';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
