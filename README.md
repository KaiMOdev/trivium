# Trivium

**Is your site citable by AI?** Trivium is an open-source audit engine that grades how well a website will be discovered, parsed, and cited by AI search systems — ChatGPT, Claude, Perplexity, Google AI Overviews, and the rest of the post-keyword search era.

Traditional SEO tools answer "will Google index this page?". Trivium also answers:

- Can a large language model *extract a clean answer* from your content?
- Is your structured data rich enough for an LLM to cite you as a source?
- Are you accessible to the new generation of AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`)?
- Does your `llms.txt` exist and point AI agents at the right content?

The classical [trivium](https://en.wikipedia.org/wiki/Trivium) was grammar, logic, and rhetoric. Trivium audits the same three:

- **Grammar** — Technical SEO: title, meta, canonical, structured data, robots, hreflang, mobile, mixed content, Core Web Vitals.
- **Logic** — LLM readiness: content clarity, citation worthiness, entity recognition, FAQ density, answer extractability, `llms.txt`, content freshness.
- **Rhetoric** — Marketing effectiveness: value proposition, CTA quality, trust signals, social proof, headline craft.

Site-type aware — an e-commerce product page is graded differently from a B2B SaaS landing page.

Every check is a deterministic heuristic — no AI, no API calls to third-party language models. Trivium runs entirely offline against any URL.

A hosted version is available at https://siteauditpro.online — the commercial product extends this open-source engine with AI-powered narrative summaries, per-check fix recommendations, and OAuth integrations to Google Search Console, Google Analytics 4, Google Ads, Adobe Analytics, and Meta Business.

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
| `api/checks/` | 29 SEO, 19 LLM-readiness, 20 marketing checks (all deterministic) |
| `api/plugins/` | CMS detection (WordPress, Shopify, AEM, others) — auth-free, HTML-only |
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
