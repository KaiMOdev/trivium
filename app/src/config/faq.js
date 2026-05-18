// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// app/src/config/faq.js
export const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "\u{1F680}",
    articles: [
      {
        question: "How do I run my first scan?",
        answer: "Enter any URL in the scan bar on the main dashboard and click 'Scan'. You'll get a complete SEO, LLM readiness, and marketing audit within seconds. No account required for your first scan.",
        tags: ["scan", "start", "url", "begin"],
      },
      {
        question: "What is a site scan vs a single page scan?",
        answer: "A **single page scan** analyzes one URL. A **site scan** discovers and analyzes multiple pages across your domain using your sitemap and internal links.\n\nPage limits per plan:\n- **Free**: 1 page (homepage only)\n- **Pro**: Up to 25 pages\n- **Premium**: Up to 200 pages",
        tags: ["site", "pages", "multi", "limit"],
      },
      {
        question: "What does the overall score mean?",
        answer: "Your overall score (0\u2013100) is a weighted average of SEO, LLM readiness, and marketing checks. Scores are color-coded:\n\n- **75\u2013100** (green): Good \u2014 your page is well-optimized.\n- **45\u201374** (yellow): Needs attention \u2014 there are meaningful improvements to make.\n- **Below 45** (red): Needs urgent fixes \u2014 critical issues are hurting your visibility.",
        tags: ["score", "rating", "number", "pass", "fail", "warn"],
      },
      {
        question: "What is a Page Audit?",
        answer: "Page Audit is a deep-dive analysis that crawls your entire site and provides per-page scores, to-do lists, and AI-powered fix suggestions. It goes beyond the regular scan by identifying site-wide patterns and prioritizing fixes.\n\nLimits per plan:\n- **Free**: 50 pages, 2 levels deep, 3 detail pages\n- **Pro**: 500 pages, 5 levels deep, all detail pages, 50 AI fixes/day\n- **Premium**: 5000 pages, unlimited depth, unlimited AI fixes",
        tags: ["audit", "page audit", "crawl", "deep", "todo"],
      },
    ],
  },
  {
    id: "scanning",
    label: "Scanning",
    icon: "\u{1F50D}",
    articles: [
      {
        question: "What checks are included in a scan?",
        answer: "Each scan runs three categories of checks:\n\n- **SEO** (33 checks): Title, meta description, headings, images, links, canonical URLs, robots, sitemap, SSL, hreflang, breadcrumbs, content depth, mobile friendliness, and more.\n- **LLM Readiness** (21 checks): Structured data, content clarity, semantic HTML, FAQ schema, answer capsules, citation worthiness, speakable markup, and AI-friendly content structure.\n- **Marketing** (25 checks): Social meta tags, analytics, CMS detection, CTA effectiveness, trust signals, social proof, form optimization, and conversion elements.\n\nFree plans see a curated subset of checks. Pro and Premium see all checks.",
        tags: ["checks", "categories", "seo", "llm", "marketing", "count"],
      },
      {
        question: "What are page types and why do they matter?",
        answer: "Trivium automatically detects the type of page being scanned \u2014 homepage, article, product, service, legal, utility, landing, FAQ, auth, gallery, support, or generic.\n\nDifferent checks are relevant for different page types. For example, a 'Content Depth' check doesn't apply to a contact page, and 'CTA Effectiveness' isn't useful on a legal page. Page-type detection ensures your scores only reflect checks that actually matter for that page.",
        tags: ["page type", "detection", "applicability", "skip"],
      },
      {
        question: "Can I scan competitor websites?",
        answer: "Yes! Use the **Compare** feature to scan competitor URLs alongside your own. You'll get a side-by-side comparison of scores across all categories.\n\nCompetitor limits per plan:\n- **Free**: Not available\n- **Pro**: Up to 2 competitors\n- **Premium**: Up to 10 competitors",
        tags: ["competitor", "compare", "benchmark"],
      },
      {
        question: "Why is my scan taking a long time?",
        answer: "Site scans analyze multiple pages with a short delay between requests to be respectful of the target server. Larger sites take longer. If a single page scan is slow, the target website may have slow response times \u2014 check the Performance section for detailed timing data.",
        tags: ["slow", "time", "loading", "wait"],
      },
      {
        question: "What does the AI suggestions feature do?",
        answer: "AI suggestions (Pro and Premium) use AI to generate specific, actionable fix recommendations based on your scan results. Instead of just flagging issues, you get concrete guidance on what to change and why. In Page Audit, AI can also generate fix code for detected issues.",
        tags: ["ai", "suggestions", "fix", "recommendations"],
      },
    ],
  },
  {
    id: "tiers-billing",
    label: "Plans & Billing",
    icon: "\u{1F4B3}",
    articles: [
      {
        question: "What are the available plans?",
        answer: "We offer three plans:\n\n- **Free**: 1 page/scan, 3 scans/month, curated checks, basic performance data.\n- **Pro** (\u20AC4.99/month): 25 pages/scan, 30 scans/month, all checks, AI suggestions, PDF export, 2 competitor compares, GSC/WordPress/AEM integrations.\n- **Premium** (\u20AC9.99/month): 200 pages/scan, unlimited scans, all integrations (GSC, GA4, WordPress, Shopify, Google Ads, Meta Business, AEM, Adobe Analytics), trend tracking, white-label reports, API access, scheduling, 10 competitor compares.",
        tags: ["plan", "price", "tier", "cost", "free", "pro", "premium"],
      },
      {
        question: "How do I upgrade my plan?",
        answer: "Go to **Account > Subscription** or click the tier badge in the header and select 'Pricing'. You'll be redirected to a secure Stripe checkout page. Your plan activates immediately after payment.",
        tags: ["upgrade", "subscribe", "payment", "stripe"],
      },
      {
        question: "How do I cancel or change my subscription?",
        answer: "Go to **Account > Subscription** and click 'Manage Billing'. This opens the Stripe customer portal where you can cancel, switch plans, or update payment methods. Your access continues until the end of the current billing period.",
        tags: ["cancel", "unsubscribe", "stop", "billing", "change"],
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: "\u{1F517}",
    articles: [
      {
        question: "What integrations are available?",
        answer: "Trivium supports these optional integrations (configure OAuth credentials in api/.env to enable):\n\n- **Google Search Console** \u2014 Search performance & indexing data\n- **WordPress API** \u2014 Pages, posts & SEO plugin analysis\n- **Adobe Experience Manager** \u2014 Auto-detected AEM config & SEO analysis\n- **Google Analytics 4** \u2014 Traffic & conversion data\n- **Shopify** \u2014 Product & collection page analysis\n- **Google Ads** \u2014 Campaign & keyword performance (via GA4)\n- **Meta Business** \u2014 Pixel health & page insights\n- **Adobe Analytics** \u2014 Page views, traffic sources & engagement",
        tags: ["integrations", "connect", "gsc", "ga4", "shopify", "wordpress", "meta", "adobe", "ads"],
      },
      {
        question: "How do I connect an integration?",
        answer: "Go to **Account > Integrations** and click 'Connect' next to the service you want. You'll be redirected to that provider to authorize access. Once connected, select the specific property or account to use. Your scan results will then include data from that integration.",
        tags: ["connect", "oauth", "authorize", "setup"],
      },
      {
        question: "Can I disconnect an integration?",
        answer: "Yes. Go to **Account > Integrations** and click the disconnect button next to any connected service. Your stored credentials are removed immediately. You can reconnect at any time.",
        tags: ["disconnect", "remove", "revoke"],
      },
    ],
  },
  {
    id: "account",
    label: "Account & Security",
    icon: "\u{1F464}",
    articles: [
      {
        question: "How do I sign in?",
        answer: "You can sign in with **Google**, **Microsoft Azure**, or an **email/password** combination. All methods create the same type of account with the same features.",
        tags: ["sign in", "login", "google", "azure", "email"],
      },
      {
        question: "How do I change my password?",
        answer: "Go to **Account > Profile** and click 'Change Password'. This is only available for email/password accounts \u2014 Google and Azure accounts are managed by those providers.",
        tags: ["password", "change", "security"],
      },
      {
        question: "How do I check my scan usage?",
        answer: "Go to **Account > Usage & History**. You'll see your current month's scan count vs. your plan limit, plus a history of all past scans with scores and dates.",
        tags: ["usage", "history", "limit", "count"],
      },
      {
        question: "How do I delete my account?",
        answer: "Submit a support ticket with the category 'Account' requesting account deletion. We'll process your request and confirm via email within 48 hours.",
        tags: ["delete", "remove", "account", "gdpr"],
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: "\u{1F4AC}",
    articles: [
      {
        question: "How do I get help with an issue?",
        answer: "You can:\n\n1. Search this **Knowledge Base** for answers.\n2. Submit a **support ticket** via the 'New Ticket' page \u2014 we respond within 24 hours.\n3. Use the **feedback form** in Account settings for feature requests or general feedback.",
        tags: ["help", "support", "contact", "ticket"],
      },
      {
        question: "How do I track my support tickets?",
        answer: "Go to **Support > My Tickets** to see all your submitted tickets, their status, and any replies. You'll also receive email notifications when there's an update.",
        tags: ["ticket", "status", "track", "reply"],
      },
    ],
  },
];
