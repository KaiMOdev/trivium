-- Google Search Console (and future integrations) token storage
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz,
  property_url text,  -- e.g. "https://example.com/" or "sc-domain:example.com"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations"
  ON user_integrations FOR ALL
  USING (auth.uid() = user_id);
