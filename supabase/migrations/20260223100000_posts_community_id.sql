-- Add community_id column to posts table (X Communities support)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS community_id text DEFAULT NULL;
