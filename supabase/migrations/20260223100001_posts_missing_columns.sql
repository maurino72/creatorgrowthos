-- Add missing posts columns (X content types v2)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS quote_tweet_id text DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reply_settings text DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS place_id text DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_thread boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_id uuid DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_position integer DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS first_published_at timestamptz DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS editable_until timestamptz DEFAULT NULL;
