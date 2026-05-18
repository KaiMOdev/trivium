// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Generates prioritized recommendations from scan check results.
 * Each recommendation has: priority, impact, effort, category, title, description, quickWin flag
 * Updated with expert-level advice based on 2025-2026 best practices.
 */

const PRIORITY = { critical: 3, important: 2, optional: 1 };
const IMPACT = { high: 3, medium: 2, low: 1 };

function deriveStatus(item) {
  if (item.status) return item.status;
  if (item.score >= 75) return "pass";
  if (item.score >= 45) return "warn";
  return "fail";
}

function buildSeoRecommendations(checks) {
  const recs = [];
  for (const check of checks) {
    const status = deriveStatus(check);
    if (status === "pass") continue;

    const isFail = status === "fail";
    const score = check.score ?? 0;
    const label = check.label?.toLowerCase() || "";

    if (label.includes("title")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Add a page title tag" : "Optimize your title tag",
        description: isFail
          ? "Your page has no title tag — the single most important on-page SEO element. Add a 50-60 character title with your primary keyword near the front. Title tags also appear as the clickable headline in search results and AI citations."
          : `${check.detail}. Keep between 50-60 characters. Place your primary keyword within the first 3 words. Include your brand name after a separator (| or —). Each page needs a unique title.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("meta") && label.includes("desc")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Add a meta description" : "Improve your meta description",
        description: isFail
          ? "No meta description found. Write a compelling 120-160 character summary that includes your target keyword and a clear call-to-action. This is your search listing's 'sales pitch' — pages with optimized meta descriptions get up to 5.8% more clicks."
          : `${check.detail}. Write a unique, actionable summary for each page. Include your primary keyword naturally and end with a clear CTA. Avoid duplicate descriptions across pages.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("h1")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "important",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: isFail ? "Add an H1 heading" : "Optimize your H1 heading",
        description: isFail
          ? "No H1 tag found. Every page needs exactly one H1 that clearly describes the page topic. This is the first element search engines and AI read to understand your content. Include your primary keyword naturally."
          : `${check.detail}. Use exactly one H1 per page — it should clearly state the page topic and include your target keyword. Think of H1 as the 'thesis statement' that both users and AI systems read first.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("heading") && label.includes("hierarch")) {
      recs.push({
        category: "seo",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Fix heading hierarchy",
        description: `${check.detail}. Maintain strict H1 > H2 > H3 nesting — never skip levels (e.g., H1 straight to H3). This creates a semantic outline that crawlers and AI systems use to parse your content structure. Proper hierarchy also improves accessibility.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("canonical")) {
      recs.push({
        category: "seo",
        priority: "important",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Set a canonical URL",
        description: `${check.detail}. Add <link rel="canonical"> to consolidate link equity and prevent duplicate content dilution. Use absolute URLs. Self-referencing canonicals are recommended even on unique pages — they protect against URL parameter variations.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("robots.txt")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "optional",
        impact: isFail ? "high" : "low",
        effort: "low",
        quickWin: true,
        title: isFail ? "Fix robots.txt blocking" : "Review robots.txt rules",
        description: isFail
          ? "Your robots.txt is blocking search engine crawlers from accessing your entire site. This prevents all indexing. Update the Disallow rules to only block admin, staging, or private pages."
          : `${check.detail}. Review your disallow rules periodically. Common mistakes: blocking CSS/JS files (hurts rendering), blocking entire directories instead of specific paths, and forgetting AI-specific bot rules.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("schema complete")) {
      recs.push({
        category: "seo",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Complete your structured data",
        description: `${check.detail}. Incomplete schema limits rich results and AI understanding. For Organization: add name, url, logo, sameAs (Wikipedia, LinkedIn, social links), and contactPoint. For Article: add author, datePublished, dateModified, headline, and image. GPT-4 accuracy jumps from 16% to 54% with properly structured data.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("schema") || label.includes("structured") || label.includes("json-ld")) {
      recs.push({
        category: "seo",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Add structured data markup",
        description: `${check.detail}. Use JSON-LD format (preferred by all AI engines). Start with Organization schema, then add Article/Product/FAQ as relevant. Schema markup enables rich snippets and is the primary way AI systems identify your entity in their knowledge graph.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("meta robot")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Remove noindex directive" : "Review robots meta tag",
        description: isFail
          ? "Your page is set to noindex — it will not appear in any search results. Remove the noindex directive unless this is intentionally a private page. This also blocks AI from citing your content."
          : `${check.detail}. The nosnippet directive prevents your content from appearing in featured snippets and AI Overviews. Use max-snippet:[number] instead if you want to control snippet length without blocking AI entirely.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("https") || label.includes("ssl")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "optional",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: isFail ? "Enable HTTPS" : "Verify SSL configuration",
        description: isFail
          ? "Your site is not using HTTPS. All modern browsers display 'Not Secure' warnings on HTTP sites, which destroys visitor trust and hurts conversions. HTTPS is also a confirmed Google ranking signal. Get a free SSL certificate from Let's Encrypt."
          : `${check.detail}. Ensure all resources load over HTTPS (no mixed content). Set up HSTS headers for extra security. Redirect all HTTP URLs to HTTPS.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("image") || label.includes("alt")) {
      recs.push({
        category: "seo",
        priority: "important",
        impact: "medium",
        effort: "medium",
        quickWin: score >= 30,
        title: "Add alt text to images",
        description: `${check.detail}. Write descriptive, specific alt text that explains what the image shows and includes relevant keywords naturally. Good alt text: "Red Nike running shoes on a trail path". Bad alt text: "image1" or "shoe". Alt text improves accessibility, image search rankings, and helps AI understand your visual content.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("mobile") || label.includes("viewport")) {
      recs.push({
        category: "seo",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Add viewport meta tag" : "Verify mobile-friendliness",
        description: isFail
          ? "No viewport meta tag found. Since 2024, all Google crawling uses the mobile Googlebot — your site must be mobile-friendly. Add: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">. Ensure text is at least 16px and touch targets are at least 48x48px."
          : `${check.detail}. Mobile-first indexing is universal — test your page with Chrome DevTools mobile simulation. Check that content doesn't overflow, buttons are tappable, and fonts are readable without zooming.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("internal")) {
      recs.push({
        category: "seo",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "medium",
        quickWin: false,
        title: "Strengthen internal linking",
        description: `${check.detail}. Keep key pages within 3 clicks of the homepage. Use descriptive anchor text with relevant keywords — avoid generic "click here" or "read more". Orphan pages (no internal links) cannot rank. Aim for 10-15+ internal links per page, linking to and from topically related content.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("content depth") || label.includes("word count") || label.includes("thin")) {
      recs.push({
        category: "seo",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "high",
        quickWin: false,
        title: isFail ? "Add more substantive content" : "Expand content depth",
        description: `${check.detail}. Google's helpful content system and AI engines reward comprehensive coverage. For informational pages, aim for 500-1000+ words covering the topic thoroughly. Quality over quantity — every paragraph should add unique value. Thin pages get filtered out of AI training data and citation candidates.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("content-to-code") || label.includes("ratio")) {
      recs.push({
        category: "seo",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "high",
        quickWin: false,
        title: "Improve content-to-code ratio",
        description: `${check.detail}. A low ratio means your HTML is bloated relative to visible content. Reduce inline styles, move JavaScript to external files, remove unused CSS/JS, and minify your code. Clean, semantic HTML improves crawl efficiency and makes content extraction easier for AI systems.`,
        score,
        sourceLabel: check.label,
      });
    } else {
      recs.push({
        category: "seo",
        priority: isFail ? "important" : "optional",
        impact: isFail ? "medium" : "low",
        effort: "medium",
        quickWin: false,
        title: `Fix: ${check.label}`,
        description: check.detail || "Review this issue and apply the recommended fix.",
        score,
        sourceLabel: check.label,
      });
    }
  }
  return recs;
}

function buildLlmRecommendations(checks) {
  const recs = [];
  for (const check of checks) {
    const status = deriveStatus(check);
    if (status === "pass") continue;

    const isFail = status === "fail";
    const score = check.score ?? 0;
    const label = check.label?.toLowerCase() || "";

    if (label.includes("ai crawler") || label.includes("ai access")) {
      recs.push({
        category: "llm",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Unblock AI crawlers" : "Review AI crawler access",
        description: `${check.detail}. In 2026, 67% of information discovery happens through AI interfaces. Update your robots.txt to allow retrieval bots (ChatGPT-User, PerplexityBot, ClaudeBot) even if you block training bots (GPTBot, Google-Extended). Separate crawl vs. training access: Allow-list retrieval bots, block-list training-only bots.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("answer capsule")) {
      recs.push({
        category: "llm",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Add answer capsules after headings",
        description: `${check.detail}. Place a concise 20-25 word definition or answer immediately after each H2 heading, then expand into details. Start with definitive phrases ('X is...', 'X refers to...'). Pages with this structure are 3x more likely to be cited by AI. Think of each H2+answer as a self-contained unit an AI can quote directly.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("extractability")) {
      recs.push({
        category: "llm",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Structure content with lists and tables",
        description: `${check.detail}. Listicles account for 50% of top AI citations, and tables increase citation rates by 2.5x. Convert key comparisons into tables, steps into numbered lists, and features into bullet points. Keep paragraphs to 2-4 sentences covering one idea. AI extracts structured content far more easily than dense prose.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("citation")) {
      recs.push({
        category: "llm",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Improve citation worthiness",
        description: `${check.detail}. Include at least one specific data point every 150-200 words. Use exact numbers ('reduced costs by 37%' not 'significantly reduced costs'). Add expert quotes with attribution. Include original data, survey results, or unique insights. Content with hard data gets cited because it adds credibility to AI-generated responses.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("author") || label.includes("expertise")) {
      recs.push({
        category: "llm",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Add author and expertise signals",
        description: `${check.detail}. Add Person schema with jobTitle, knowsAbout, and alumniOf. Create a dedicated author bio page and link it from your articles. Include verifiable credentials — certifications, years of experience, published work. AI engines evaluate source credibility before citing: content from identifiable experts with credentials gets priority.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("source") && label.includes("attrib")) {
      recs.push({
        category: "llm",
        priority: "important",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Add source citations and references",
        description: `${check.detail}. Link to authoritative sources for non-obvious claims. Use <blockquote> for expert quotes and <cite> for source references. Pages that cite authoritative sources are themselves 30-40% more likely to be cited by AI — it's a credibility multiplier. Aim for at least one cited source per major section.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("entity")) {
      recs.push({
        category: "llm",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Strengthen entity recognition",
        description: `${check.detail}. Add Organization/LocalBusiness schema with sameAs links to Wikipedia, Wikidata, LinkedIn, and social profiles. This helps AI resolve your entity in their knowledge graph. Unresolved entities get ignored by AI systems. Ensure consistent NAP (Name, Address, Phone) across all structured data and directory listings.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("faq") || label.includes("question")) {
      recs.push({
        category: "llm",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Add FAQ content with schema",
        description: `${check.detail}. FAQ content with FAQPage schema achieves 40-60% higher AI citation rates because explicit Q&A pairing removes ambiguity for AI systems. Write 5-10 questions your audience actually asks. Each answer should be 2-3 self-contained sentences. Use the exact phrasing people search for — AI systems match question patterns.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("content") && label.includes("clar")) {
      recs.push({
        category: "llm",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Clarify your main topic for AI",
        description: `${check.detail}. Your H1 and first paragraph must clearly state what this page is about. Avoid generic headers like 'Welcome' or 'Home'. State your main offering, service, or topic within the first 100 words. AI systems read the H1 + first paragraph to decide if your page answers a query — vague openings mean you're never selected.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("answer density")) {
      recs.push({
        category: "llm",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "medium",
        quickWin: false,
        title: "Increase answer density",
        description: `${check.detail}. Write paragraphs that are 15-80 words, each making a specific claim with supporting data. Avoid filler, jargon, and unsupported generalizations. Each paragraph should be independently useful — if an AI extracted just that one paragraph, would it be a complete, accurate answer?`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("freshness")) {
      recs.push({
        category: "llm",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Add freshness signals",
        description: `${check.detail}. Add both datePublished and dateModified to your Article schema — and ensure dateModified changes when you actually update content. Display a visible 'Last updated: [date]' on the page. AI deprioritizes undated or stale content. Review and update your key pages quarterly at minimum.`,
        score,
        sourceLabel: check.label,
      });
    } else {
      recs.push({
        category: "llm",
        priority: isFail ? "important" : "optional",
        impact: isFail ? "medium" : "low",
        effort: "medium",
        quickWin: false,
        title: `Improve: ${check.label}`,
        description: check.detail || "Optimize this aspect of your content for better AI discoverability and citation potential.",
        score,
        sourceLabel: check.label,
      });
    }
  }
  return recs;
}

function buildMarketingRecommendations(checks) {
  const recs = [];
  for (const check of checks) {
    const status = deriveStatus(check);
    if (status === "pass") continue;

    const isFail = status === "fail";
    const score = check.score ?? 0;
    const label = check.label?.toLowerCase() || "";

    if (label.includes("cta") || label.includes("call")) {
      recs.push({
        category: "marketing",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Add clear calls-to-action" : "Strengthen your CTAs",
        description: isFail
          ? "No CTAs found. Place a clear, compelling CTA above the fold — visitors should know what action to take within one glance. Use action verbs: 'Get Started', 'Book a Demo', 'Try Free'. Position social proof metrics directly next to your CTA."
          : `${check.detail}. Use first-person phrasing ('Start my free trial' vs 'Start your free trial') for up to 90% higher conversion. A/B test button color, copy, and placement. Repeat your CTA after every major content section.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("trust")) {
      recs.push({
        category: "marketing",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Add trust signals",
        description: `${check.detail}. Video testimonials increase conversion by 80%. Display client logos, certifications, and security badges near decision points (CTAs, pricing, signup forms). Use specific numbers: 'Trusted by 10,000+ companies' is far stronger than 'Trusted by many'. Add real customer names and photos to testimonials.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("social proof")) {
      recs.push({
        category: "marketing",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Strengthen social proof",
        description: `${check.detail}. 75% of consumers search for reviews before buying. Feature specific metrics prominently: '4.8/5 from 500 reviews', '10,000+ happy customers'. Embed review widgets from Google, Trustpilot, or G2. Link to detailed case studies with measurable results. Real-time social proof notifications boost conversions by 98%.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("value") || label.includes("proposition")) {
      recs.push({
        category: "marketing",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Clarify your value proposition",
        description: `${check.detail}. Visitors decide within 5 seconds whether to stay. Lead with the specific outcome you deliver, not features. Use the formula: '[Product] helps [audience] [achieve outcome] by [mechanism]'. Include quantified proof: '3x faster', 'Save 10 hours/week'. Remove generic buzzwords (world-class, leading, innovative).`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("review") || label.includes("rating")) {
      recs.push({
        category: "marketing",
        priority: "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: "Add reviews and ratings",
        description: `${check.detail}. Products with 5+ reviews are 270% more likely to be purchased. Add AggregateRating schema for star-rating rich snippets (20-30% higher CTR). Embed reviews from Google Business, Trustpilot, or industry platforms directly on your page. Respond to reviews publicly — it shows engagement and builds trust.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("video")) {
      recs.push({
        category: "marketing",
        priority: isFail ? "important" : "optional",
        impact: "high",
        effort: "high",
        quickWin: false,
        title: "Add video content",
        description: `${check.detail}. Video lifts conversion rates by up to 86% and increases time on page. 23.3% of Google AI Overview citations reference YouTube content. Add a short explainer or demo video on landing pages. Use VideoObject schema so AI systems can index and reference your video. Provide transcripts for accessibility and additional SEO value.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("contact")) {
      recs.push({
        category: "marketing",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Add visible contact information",
        description: `${check.detail}. Include phone (tel: link), email (mailto: link), and a contact form. Display at least phone/email in your header or footer on every page. Add ContactPoint schema for Knowledge Panel display. For local businesses, consistent NAP across directories is critical for local SEO rankings.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("privacy") || label.includes("security")) {
      recs.push({
        category: "marketing",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Add privacy and compliance signals",
        description: `${check.detail}. Privacy policy, terms of service, and cookie consent are table stakes in 2026. Display them prominently in your footer. Add security badges and trust seals near forms and checkout. Without these, visitors question your legitimacy and bounce — especially on sites that collect personal data.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("tone")) {
      recs.push({
        category: "marketing",
        priority: isFail ? "important" : "optional",
        impact: "low",
        effort: "medium",
        quickWin: false,
        title: "Improve content consistency",
        description: `${check.detail}. Maintain 2-4 sentences per paragraph for optimal readability. Use a consistent voice throughout — formal or casual, but not both. Break long sections with subheadings every 200-300 words. Consistent formatting signals professionalism and keeps readers engaged.`,
        score,
        sourceLabel: check.label,
      });
    } else {
      recs.push({
        category: "marketing",
        priority: isFail ? "important" : "optional",
        impact: isFail ? "medium" : "low",
        effort: "medium",
        quickWin: false,
        title: `Improve: ${check.label}`,
        description: check.detail || "Review and optimize this marketing element for better conversions.",
        score,
        sourceLabel: check.label,
      });
    }
  }
  return recs;
}

function buildPerformanceRecommendations(performance) {
  const recs = [];
  if (!performance || performance.error) return recs;

  // Recommendations from metrics
  for (const metric of (performance.metrics || [])) {
    if (metric.score >= 75) continue;

    const isFail = metric.score < 45;
    const label = metric.label;

    if (label === "LCP") {
      recs.push({
        category: "performance",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "medium",
        quickWin: false,
        title: isFail ? "Fix slow Largest Contentful Paint" : "Improve LCP load time",
        description: `LCP is ${metric.value} (target ${metric.target}). Optimize your largest visible element — compress hero images to WebP/AVIF format, preload the LCP resource with <link rel="preload">, reduce server response time (TTFB), and eliminate render-blocking CSS/JS. LCP is the strongest Core Web Vital for perceived speed.`,
        score: metric.score,
        sourceLabel: metric.fullName,
      });
    } else if (label === "CLS") {
      recs.push({
        category: "performance",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: isFail ? "Fix layout shift issues" : "Reduce Cumulative Layout Shift",
        description: `CLS is ${metric.value} (target ${metric.target}). Set explicit width/height on all images and videos. Use CSS aspect-ratio for responsive media. Never insert content above existing content without user interaction. Use CSS containment for dynamic elements. Fonts: use font-display: swap with size-adjust to prevent FOIT/FOUT shifts.`,
        score: metric.score,
        sourceLabel: metric.fullName,
      });
    } else if (label === "INP") {
      recs.push({
        category: "performance",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "high",
        quickWin: false,
        title: isFail ? "Fix slow interactions (INP)" : "Improve Interaction to Next Paint",
        description: `INP is ${metric.value} (target ${metric.target}). INP replaced FID as a Core Web Vital and measures ALL user interactions. 43% of sites fail the 200ms threshold. Break long JavaScript tasks into smaller chunks using scheduler.yield() or setTimeout. Defer non-critical scripts. Use requestIdleCallback for non-urgent work. Profile with Chrome DevTools Performance panel.`,
        score: metric.score,
        sourceLabel: metric.fullName,
      });
    } else if (label === "TBT" || label === "FID") {
      recs.push({
        category: "performance",
        priority: isFail ? "critical" : "important",
        impact: "high",
        effort: "high",
        quickWin: false,
        title: isFail ? "Fix main thread blocking" : "Improve interactivity",
        description: `${metric.fullName} is ${metric.value} (target ${metric.target}). Break up long JavaScript tasks, defer non-critical scripts with async/defer attributes, remove unused JavaScript (audit with Chrome Coverage tool), and use web workers for CPU-intensive operations.`,
        score: metric.score,
        sourceLabel: metric.fullName,
      });
    } else if (label === "FCP") {
      recs.push({
        category: "performance",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "medium",
        quickWin: false,
        title: "Speed up First Contentful Paint",
        description: `FCP is ${metric.value} (target ${metric.target}). Inline critical above-the-fold CSS, defer non-critical stylesheets, and reduce server response time. Use preconnect for third-party origins and preload for critical fonts. Consider server-side rendering for critical content.`,
        score: metric.score,
        sourceLabel: metric.fullName,
      });
    } else {
      recs.push({
        category: "performance",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "medium",
        quickWin: false,
        title: `Improve ${metric.fullName}`,
        description: `${metric.fullName} is ${metric.value} (target ${metric.target}). ${metric.detail}`,
        score: metric.score,
        sourceLabel: metric.fullName,
      });
    }
  }

  // Recommendations from Lighthouse opportunities
  for (const opp of (performance.opportunities || [])) {
    if (opp.savingsMs < 100) continue;
    recs.push({
      category: "performance",
      priority: opp.savingsMs >= 1000 ? "critical" : opp.savingsMs >= 300 ? "important" : "optional",
      impact: opp.savingsMs >= 1000 ? "high" : opp.savingsMs >= 300 ? "medium" : "low",
      effort: "medium",
      quickWin: opp.savingsMs >= 500,
      title: opp.title,
      description: `${opp.description} Potential savings: ~${opp.savingsMs >= 1000 ? `${(opp.savingsMs / 1000).toFixed(1)}s` : `${opp.savingsMs}ms`}.`,
      score: opp.score,
      sourceLabel: opp.title,
    });
  }

  return recs;
}

function buildWordPressRecommendations(wordpress) {
  if (!wordpress?.available || !wordpress.checks) return [];

  const recs = [];
  for (const check of wordpress.checks) {
    const status = check.score >= 75 ? "pass" : check.score >= 45 ? "warn" : "fail";
    if (status === "pass") continue;

    const isFail = status === "fail";
    const score = check.score ?? 0;
    const label = check.label?.toLowerCase() || "";

    if (label.includes("seo plugin")) {
      recs.push({
        category: "wordpress",
        priority: "critical",
        impact: "high",
        effort: "low",
        quickWin: true,
        title: "Install an SEO plugin",
        description: `${check.detail}. Install Yoast SEO, Rank Math, or All in One SEO to get XML sitemaps, meta tag management, schema markup, breadcrumbs, and canonical URLs out of the box. Without an SEO plugin, WordPress lacks critical SEO features that other CMS platforms include by default.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("freshness")) {
      recs.push({
        category: "wordpress",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "high",
        quickWin: false,
        title: "Publish fresh content regularly",
        description: `${check.detail}. Search engines and AI systems favor sites with consistent publishing schedules. Aim for at least weekly posts. Update existing high-traffic posts with new data and re-publish with a current date. Use WordPress's scheduling feature to maintain a consistent cadence.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("frequency")) {
      recs.push({
        category: "wordpress",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "high",
        quickWin: false,
        title: "Maintain a consistent publishing schedule",
        description: `${check.detail}. Batch-create content and schedule it in WordPress to maintain regularity. Use an editorial calendar plugin to plan ahead. Consistent publishing signals to search engines that your site is actively maintained.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("excerpt")) {
      recs.push({
        category: "wordpress",
        priority: "important",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Add custom excerpts to posts",
        description: `${check.detail}. WordPress auto-generates excerpts from the first 55 words, which are rarely optimized for search. Write a custom 120-160 character excerpt for each post — this feeds into meta descriptions, RSS feeds, and archive pages. SEO plugins can map excerpts to meta descriptions automatically.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("featured")) {
      recs.push({
        category: "wordpress",
        priority: "important",
        impact: "medium",
        effort: "low",
        quickWin: true,
        title: "Add featured images to all posts",
        description: `${check.detail}. Featured images appear in social shares (og:image), archive pages, related posts, and Google Discover. Posts without featured images get significantly less social engagement and miss rich result opportunities. Use 1200x630px images for optimal social display.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("taxonomy")) {
      recs.push({
        category: "wordpress",
        priority: isFail ? "important" : "optional",
        impact: "medium",
        effort: "medium",
        quickWin: false,
        title: "Clean up taxonomy structure",
        description: `${check.detail}. Delete or merge empty categories and unused tags — they create thin, indexable pages that dilute your SEO. Add descriptions to every category (used by some themes and SEO plugins as meta descriptions). Keep categories broad and tags specific. Aim for 5-15 posts per category.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("author") || label.includes("enumeration")) {
      recs.push({
        category: "wordpress",
        priority: isFail ? "important" : "optional",
        impact: "low",
        effort: "low",
        quickWin: true,
        title: "Restrict user enumeration via REST API",
        description: `${check.detail}. Exposed usernames make brute-force attacks easier. Add a security plugin (Wordfence, Sucuri) or a code snippet to disable the /wp-json/wp/v2/users endpoint for unauthenticated requests. This is especially important if admin usernames match login credentials.`,
        score,
        sourceLabel: check.label,
      });
    } else if (label.includes("rest api") || label.includes("exposure")) {
      recs.push({
        category: "wordpress",
        priority: isFail ? "important" : "optional",
        impact: "low",
        effort: "medium",
        quickWin: false,
        title: "Review REST API exposure",
        description: `${check.detail}. Each plugin can register its own API namespace, expanding your attack surface. Audit which namespaces are necessary and restrict the rest using a plugin like Disable REST API or custom permission callbacks. Keep the core wp/v2 namespace for functionality but restrict sensitive endpoints.`,
        score,
        sourceLabel: check.label,
      });
    } else {
      recs.push({
        category: "wordpress",
        priority: isFail ? "important" : "optional",
        impact: isFail ? "medium" : "low",
        effort: "medium",
        quickWin: false,
        title: `Fix: ${check.label}`,
        description: check.detail || "Review this WordPress-specific issue.",
        score,
        sourceLabel: check.label,
      });
    }
  }
  return recs;
}

/**
 * Generate all recommendations from scan results, sorted by priority then impact.
 */
export function generateRecommendations(results, tier) {
  if (!results) return [];

  const all = [
    ...buildSeoRecommendations(results.seo || []),
    ...(tier !== "free" ? buildLlmRecommendations(results.llm || []) : []),
    ...(tier !== "free" ? buildMarketingRecommendations(results.marketing || []) : []),
    ...buildPerformanceRecommendations(results.performance),
    ...buildWordPressRecommendations(results.wordpress),
  ];

  // Sort: critical first, then by impact, then quickWins first
  all.sort((a, b) => {
    const pd = PRIORITY[b.priority] - PRIORITY[a.priority];
    if (pd !== 0) return pd;
    const id = IMPACT[b.impact] - IMPACT[a.impact];
    if (id !== 0) return id;
    if (a.quickWin && !b.quickWin) return -1;
    if (!a.quickWin && b.quickWin) return 1;
    return (a.score ?? 50) - (b.score ?? 50); // worse scores first
  });

  return all;
}

/**
 * Compute summary stats from recommendations
 */
export function computeInsightsSummary(recommendations, scores) {
  const critical = recommendations.filter(r => r.priority === "critical").length;
  const important = recommendations.filter(r => r.priority === "important").length;
  const optional = recommendations.filter(r => r.priority === "optional").length;
  const quickWins = recommendations.filter(r => r.quickWin).length;
  const totalIssues = recommendations.length;

  // Estimate potential score improvement from fixing critical+important items
  const potentialGain = Math.min(
    100 - (scores?.seo ?? 0),
    critical * 8 + important * 4 + quickWins * 2
  );

  return { critical, important, optional, quickWins, totalIssues, potentialGain };
}
