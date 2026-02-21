-- Metrics & Analytics: metric_snapshots, follower_snapshots, metric_fetch_log

-- metric_snapshots: append-only time-series of post metrics
CREATE TABLE metric_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform        platform_type NOT NULL,
  post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
  platform_post_id TEXT NOT NULL,

  -- Metric values at time of snapshot
  impressions     BIGINT,
  unique_reach    BIGINT,
  reactions       BIGINT,
  comments        BIGINT,
  shares          BIGINT,
  quotes          BIGINT,
  bookmarks       BIGINT,

  -- Video metrics (null for non-video posts)
  video_plays     BIGINT,
  video_watch_time_ms BIGINT,
  video_unique_viewers BIGINT,

  -- Metadata
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (platform_post_id, platform, fetched_at)
);

CREATE INDEX idx_metric_snapshots_user_platform
  ON metric_snapshots(user_id, platform, fetched_at DESC);
CREATE INDEX idx_metric_snapshots_post
  ON metric_snapshots(platform_post_id, platform, fetched_at DESC);
CREATE INDEX idx_metric_snapshots_fetched
  ON metric_snapshots(fetched_at DESC);

-- follower_snapshots: daily follower tracking
CREATE TABLE follower_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform        platform_type NOT NULL,

  follower_count  BIGINT NOT NULL,
  new_followers   BIGINT,

  snapshot_date   DATE NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, platform, snapshot_date)
);

CREATE INDEX idx_follower_snapshots_user
  ON follower_snapshots(user_id, platform, snapshot_date DESC);

-- metric_fetch_log: job tracking for API budget management
CREATE TABLE metric_fetch_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform        platform_type NOT NULL,
  platform_post_id TEXT,
  fetch_type      TEXT NOT NULL CHECK (fetch_type IN ('post_metrics', 'video_metrics', 'follower_stats', 'aggregated_metrics')),
  status          TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited')),
  error_message   TEXT,
  api_calls_used  INTEGER DEFAULT 1,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fetch_log_user
  ON metric_fetch_log(user_id, platform, fetch_type, fetched_at DESC);

-- RLS
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_fetch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own metric snapshots"
  ON metric_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage metric snapshots"
  ON metric_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own follower snapshots"
  ON follower_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage follower snapshots"
  ON follower_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own fetch logs"
  ON metric_fetch_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage fetch logs"
  ON metric_fetch_log FOR ALL
  USING (true)
  WITH CHECK (true);
