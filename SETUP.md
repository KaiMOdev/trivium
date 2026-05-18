# Setup

## Minimal setup

You only need Node 22 and npm. Clone, install, copy the example env, and run:

```bash
git clone https://github.com/KaiMOdev/trivium.git
cd trivium
npm install
cp api/.env.example api/.env
npm run dev
```

This starts the API on `http://localhost:3001` and the frontend on `http://localhost:5173`. The Vite dev server proxies `/api/*` to the backend.

The scanner works against any public URL out of the box. AI features, OAuth integrations, and PageSpeed-with-quota are opt-in.

## Enabling AI features

AI suggestions and summaries call Anthropic's Claude API directly. You supply the key:

1. Sign up at https://console.anthropic.com/ and create an API key.
2. Add it to `api/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart `npm run dev:api`.

`GET /api/health` returns `{ "aiEnabled": true }` when configured. The frontend uses this flag to show/hide the AI panels.

You're billed by Anthropic per token; the default model is `claude-sonnet-4-6`. Override via `AI_MODEL` in `api/.env`.

## Enabling Google PageSpeed Insights

Without a key, Trivium falls back to the anonymous PageSpeed Insights API which is rate-limited. To remove that limit:

1. Get a key at https://developers.google.com/speed/docs/insights/v5/get-started.
2. Add `PSI_API_KEY=...` to `api/.env`.

## OAuth integrations (optional)

Each integration is independent — set up only the ones you need.

### Google Search Console + Google Analytics 4 + Google Ads

1. Go to https://console.cloud.google.com/apis/credentials.
2. Create an OAuth 2.0 Client ID (Web application).
3. Add `http://localhost:3001/api/integrations/gsc/callback` and `http://localhost:3001/api/integrations/ga4/callback` to **Authorized redirect URIs**.
4. Enable these APIs for the project: **Search Console API**, **Google Analytics Data API**, **Google Ads API**.
5. Add to `api/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/gsc/callback
   GOOGLE_GA4_REDIRECT_URI=http://localhost:3001/api/integrations/ga4/callback
   ```
6. Restart the API. From the app, open the Integrations panel and connect.

### Adobe Analytics

1. Create an integration at https://developer.adobe.com/console.
2. Add the redirect URI `http://localhost:3001/api/integrations/adobe-analytics/callback`.
3. Add to `api/.env`:
   ```
   ADOBE_CLIENT_ID=...
   ADOBE_CLIENT_SECRET=...
   ADOBE_REDIRECT_URI=http://localhost:3001/api/integrations/adobe-analytics/callback
   ```

### Meta Business

1. Create an app at https://developers.facebook.com/apps.
2. Add Facebook Login and set the OAuth redirect URI to `http://localhost:3001/api/integrations/meta/callback`.
3. Request the `pages_read_engagement` and `read_insights` permissions.
4. Add to `api/.env`:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=http://localhost:3001/api/integrations/meta/callback
   ```

## Token encryption

OAuth tokens are persisted to local JSON files (`api/.dev-gsc-tokens.json`, etc., all gitignored). To encrypt them at rest, generate a 32-byte hex key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add it to `api/.env` as `INTEGRATION_ENCRYPTION_KEY=`. Required only if you use integrations and want encryption at rest.

## Tuning scan limits

All of these are env-tunable in `api/.env` with reasonable defaults:

| Variable | Default | What it does |
| --- | --- | --- |
| `PAGE_LIMIT` | 200 | Max pages per multi-page scan |
| `AUDIT_PAGE_LIMIT` | 5000 | Max pages per /audit/discover run |
| `AUDIT_DEPTH_LIMIT` | 10 | Max crawl depth |
| `SCAN_CONCURRENCY` | 3 | Parallel requests during multi-page scans |
| `CRAWL_DELAY_MS` | 300 | Politeness delay between requests |
| `SCAN_RATE_LIMIT` | 20 | Per-IP requests/minute for scan endpoints |

## Production deployment

Trivium is a normal Node + Vite app. Any Node 22 host works — Render, Railway, Fly.io, Vercel (with the API as a separate service), self-hosted, etc.

Build the frontend with `npm run build` (outputs to `app/dist/`) and run the API with `npm start`. Set `NODE_ENV=production` and `FRONTEND_URL=https://your-domain.tld` in the environment.

The repo intentionally does **not** ship a `fly.toml` or `vercel.json` — your deployment, your choice.
