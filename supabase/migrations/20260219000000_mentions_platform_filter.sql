-- Add mentions column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mentions text[] DEFAULT '{}';

-- Add platform column to insights and experiments for platform filtering
ALTER TABLE insights ADD COLUMN IF NOT EXISTS platform text DEFAULT NULL;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS platform text DEFAULT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
