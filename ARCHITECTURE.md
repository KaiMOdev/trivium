# Architecture

## Repository layout

```
trivium/
├── app/                              React frontend (Vite, ESM)
│   ├── src/
│   │   ├── SiteAuditApp.jsx          Main dashboard component
│   │   ├── main.jsx                  Entry point
│   │   ├── checks/                   Frontend mock fallbacks
│   │   ├── components/               UI components (CheckRow, ScoreRing, etc.)
│   │   ├── config/                   theme.js, faq.js, explanations.js
│   │   ├── contexts/AuthContext.jsx  OSS stub (no auth)
│   │   ├── hooks/                    useScan, useAISuggestions, useAISummary, ...
│   │   └── utils/                    generatePDF, recommendations
│   └── index.html
├── api/                              Express backend (CommonJS)
│   ├── index.js                      Server entry; scan endpoints
│   ├── crawler.js                    fetchPage, parsePage, discoverPages
│   ├── checks/
│   │   ├── seo.js                    29 SEO checks
│   │   ├── llm.js                    19 LLM-readiness checks
│   │   ├── marketing.js              20 marketing checks
│   │   └── performance.js            PageSpeed Insights wrapper
│   ├── config/
│   │   ├── tiers.js                  Env-driven scan limits
│   │   ├── ai.js                     AI model + prompts
│   │   └── checkApplicability.js     Per-page-type skip map
│   ├── middleware/
│   │   ├── auth.js                   No-op stubs (no auth in OSS)
│   │   ├── ssrf.js                   SSRF protection for fetched URLs
│   │   └── rateLimit.js              Express-rate-limit wrappers
│   ├── plugins/
│   │   ├── detect.js                 CMS detection
│   │   ├── wordpress.js              WP REST API analysis
│   │   ├── shopify.js                Shopify storefront analysis
│   │   ├── aem.js                    Adobe Experience Manager
│   │   ├── gsc.js / ga4.js / ads.js  Google integrations (OAuth)
│   │   ├── adobe-analytics.js        Adobe Analytics (OAuth)
│   │   ├── meta.js                   Meta Business (OAuth)
│   │   └── oauth-utils.js            Shared OAuth helpers
│   ├── routes/
│   │   ├── ai.js                     /api/ai/suggestions, /api/ai/summary
│   │   ├── audit.js                  /api/audit/fix
│   │   └── integrations.js           OAuth flows for all integrations
│   ├── services/
│   │   ├── ai.js                     Anthropic client, prompts, response cache
│   │   └── audit.js                  AI-powered fix-suggestion generator
│   ├── utils/
│   │   ├── pageType.js               Page-type classifier
│   │   ├── readability.js            Flesch-Kincaid scoring
│   │   ├── crypto.js                 Token encryption helper
│   │   ├── debug.js                  Conditional debug logger
│   │   └── fetch-helpers.js          checkExists, fetchTextFile
│   └── migrations/                   Reference SQL (only used if you wire up Supabase)
└── ARCHITECTURE.md                   (you are here)
```

## Scan flow

1. Frontend POSTs `{ url }` to `/api/scan`, `/api/scan/site`, `/api/scan/compare`, or `/api/audit/discover`.
2. `scanUrl()` in `api/index.js` fetches the page (`crawler.fetchPage`), robots.txt, llms.txt, and PageSpeed result in parallel.
3. The HTML is parsed with Cheerio into a `pageData` shape: title, meta, headings, JSON-LD, images, links, visible text.
4. `detectPageType(pageData)` classifies the page (`homepage`, `article`, `product`, `service`, `legal`, `utility`, `landing`, `faq`, `auth`, `gallery`, `support`, `generic`). The classifier is in `api/utils/pageType.js`.
5. `runSeoChecks`, `runLlmChecks`, `runMarketingChecks` each run their suite. Page-type-aware skipping happens via `api/config/checkApplicability.js` — irrelevant checks are returned with `status: "na"` so they don't drag the score.
6. CMS detection (`plugins/detect.js`) runs in parallel. If WordPress / Shopify / AEM is detected, the platform-specific analyzer pulls extra signals (REST API, theme files, etc.).
7. If `ANTHROPIC_API_KEY` is set, `classifyAndAudit()` from `services/ai.js` runs four AI-powered checks (CTA relevance, value-prop clarity, content-audience fit, brand consistency) in parallel with the deterministic checks.
8. OAuth integrations (GSC, GA4, Adobe Analytics, Meta) fetch their data if connected.
9. Per-category weighted scores are computed (each check has a weight 1–3 based on severity).
10. Result is returned. For `/api/scan/site` and `/api/audit/discover`, results stream as NDJSON one event per page.

## Check data shapes

```js
// SEO check
{ label: "Title Tag", status: "pass" | "warn" | "fail" | "na", detail: "…", score: 0–100 }

// LLM / marketing check
{ label: "FAQ Presence", score: 0–100, detail: "…", status?: "na" }
```

Status is derived from score:
- `>= 75` → pass
- `45–74` → warn
- `< 45` → fail
- `null` or explicit `status: "na"` → not applicable (excluded from scoring)

## AI service

`api/services/ai.js` exports:

- `generateFixSuggestion(check, meta, classification)` — used by `/api/ai/suggestions`
- `generateAuditSummary(scores, worstChecks, meta, bestChecks, classification)` — used by `/api/ai/summary`
- `classifyAndAudit(signals, siteHint)` — runs during every scan when AI is enabled
- `isAIEnabled()` — boolean for runtime gating

All three are no-ops when `ANTHROPIC_API_KEY` is missing — they return `{ error: "AI service not configured" }` (the route handlers translate this to HTTP 503).

There's an in-memory response cache (LRU, 5000 entries, 7-day TTL). It's lost on restart — for OSS, that's fine.

## Page-type detection

The classifier in `api/utils/pageType.js` looks at:
- URL path patterns (`/blog/`, `/products/`, `/legal/`, `/login/`, etc.)
- Title tokens (`Privacy`, `Terms`, `Sign in`)
- JSON-LD `@type` (`Product`, `Article`, `FAQPage`, `WebPage`)
- Heading structure
- Form presence
- Image-to-text ratio

It's intentionally fuzzy — returning `generic` is a valid output for pages that don't match anything specific. The check applicability map in `api/config/checkApplicability.js` is the source of truth for which checks apply to which page type.

## Auth, persistence, and tiers

The open-source build has **none of these**. The frontend never talks to Supabase. The backend never writes scan results to a database. There is no user concept, no tier concept, and no paywall.

The `app/src/contexts/AuthContext.jsx` and `api/middleware/auth.js` files exist as stubs because the surrounding code references them; they're no-ops in OSS. A hosted/commercial deployment that needs auth+persistence would reintroduce them outside this repo.

## What's intentionally not here

- `fly.toml`, `vercel.json` — infrastructure choices are yours.
- Marketing site (`demo-site/`) — separate from the engine.
- WordPress companion plugin — separate codebase.
- Stripe / billing / subscription — not part of the OSS engine.
- Sentry / observability — bring your own.
