# Trivium

**A full-stack website audit — technical SEO, LLM-readiness, and marketing effectiveness — in a single deterministic engine.**

The classical [trivium](https://en.wikipedia.org/wiki/Trivium) was grammar, logic, and rhetoric. Trivium grades a webpage against the same three:

### 🔧 Grammar — Technical SEO (29 checks)

Is the page well-formed and indexable?

Title tag, meta description, H1 hierarchy, canonical URL, hreflang, Open Graph, JSON-LD schema, schema currency, robots.txt, sitemap presence, SSL, mobile viewport, mixed content, redirect chain, image alt tags, modern image formats, responsive images, URL cleanliness, content-to-code ratio, internal linking depth, breadcrumb schema, favicon, review schema integrity, Core Web Vitals via PageSpeed Insights.

### 🤖 Logic — LLM readiness (19 checks)

Can an AI search system parse, cite, and quote the page?

Content clarity and structure, answer extractability, citation worthiness, entity recognition, FAQ presence, question-shaped headings, definition clarity, source attribution, author and expertise signals, WebSite / WebPage / Speakable / HowTo schema, content freshness, AI-bot accessibility (`GPTBot`, `ClaudeBot`, `PerplexityBot` and others), `llms.txt` presence, content readability (Flesch-Kincaid), sentence complexity.

### 🎯 Rhetoric — Marketing effectiveness (20 checks)

Will the page actually convert the visitors it earns?

Value proposition specificity, CTA effectiveness and copy quality, CTA-above-fold placement, trust signals, social proof, headline formula quality, benefit-vs-feature language, urgency and scarcity cues, emotional trigger words, above-fold messaging, contact visibility, reviews and ratings, video content, form optimization, accessibility landmarks, typography quality, color contrast, logo detection, font display optimization, preconnect hints.

---

**Site-type aware.** An e-commerce product page is graded differently from a B2B SaaS landing page, a contact page, or a legal page. The check applicability map prevents irrelevant checks from dragging the score.

**Deterministic.** Every check is a heuristic against the page's HTML — no AI calls, no third-party language models, no API keys to manage. Trivium runs entirely on its own.

A hosted version with AI-powered narrative summaries, per-check fix suggestions, and OAuth integrations to Google Search Console / GA4 / Adobe / Meta is available at https://siteauditpro.online.

## Quick start

```bash
git clone https://github.com/KaiMOdev/trivium.git
cd trivium
npm install
cp api/.env.example api/.env
npm run dev
```

Open http://localhost:5173 and scan any URL. No signup, no database, no external services.

## What's in the box

| Path | What it is |
| --- | --- |
| `app/` | React 19 frontend (Vite) |
| `api/` | Express backend |
| `api/checks/` | SEO, LLM-readiness, marketing, and performance check suites |
| `api/plugins/` | CMS detection — WordPress, Shopify, AEM, generic (all auth-free, HTML-only) |
| `api/utils/pageType.js` | Page-type classifier (homepage, article, product, service, legal, …) |
| `ARCHITECTURE.md` | Deeper code tour |

## Tech stack

- React 19 + Vite, no UI library — inline styles, dark theme
- Node 22 + Express 5
- Cheerio for HTML parsing
- Google PageSpeed Insights for Core Web Vitals

## Documentation

- [`SETUP.md`](SETUP.md) — Detailed setup and configuration.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Code structure, scan flow, page-type detection.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — How to contribute.
- [`SECURITY.md`](SECURITY.md) — Reporting vulnerabilities.
- [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md) — Closed-source / proprietary use.

## License

Trivium is [AGPL-3.0-only](LICENSE). If you run a modified version as a public-facing service, you must publish your modifications under AGPL-3.0.

If AGPL doesn't fit your use case — for example, you want to embed Trivium in a closed-source commercial product — see [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md).

Copyright © 2026 Lams IT Solutions.
