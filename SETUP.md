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

The scanner works against any public URL out of the box. PageSpeed-with-quota is the only opt-in.

Features that are **not** in the OSS build:

- **AI-powered narrative summaries** and per-check fix suggestions.
- **OAuth integrations** to Google Search Console, Google Analytics 4, Google Ads, Adobe Analytics, and Meta Business.

Both live in the commercial product at https://siteauditpro.online. The open-source engine is pure deterministic heuristics against the page's HTML.

## Enabling Google PageSpeed Insights

Without a key, Trivium falls back to the anonymous PageSpeed Insights API which is rate-limited. To remove that limit:

1. Get a key at https://developers.google.com/speed/docs/insights/v5/get-started.
2. Add `PSI_API_KEY=...` to `api/.env`.

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
