CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('single', 'site')),
  pages_scanned INTEGER NOT NULL DEFAULT 1,
  overall_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scan history"
  ON scan_history FOR SELECT
  USING (auth.uid() = user_id);

-- Server inserts via service-role key (bypasses RLS)
-- No INSERT policy needed for end users

CREATE INDEX IF NOT EXISTS idx_scan_history_user_created
  ON scan_history (user_id, created_at DESC);
