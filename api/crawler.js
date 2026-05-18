// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const cheerio = require("cheerio");
const { validateUrlSafety } = require("./middleware/ssrf");
const { isCJK, countCJKWords } = require("./utils/readability");
const { matchesPathFilter } = require("./utils/pathFilter");

const TIMEOUT = 15000;

/**
 * Fetch a URL and return its HTML content using built-in fetch.
 * Validates URL against SSRF before fetching.
 */
async function fetchPage(url) {
  await validateUrlSafety(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  const MAX_REDIRECTS = 5;
  let currentUrl = url;
  const redirectChain = [];

  try {
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Trivium/1.0 (open-source web audit tool)",
          Accept: "text/html,application/xhtml+xml",
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
        redirect: "manual",
      });

      // Handle redirects manually to validate each hop
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) throw new Error("Redirect without Location header");
        redirectChain.push({ url: currentUrl, status: res.status });
        const nextUrl = new URL(location, currentUrl).href;
        await validateUrlSafety(nextUrl);
        currentUrl = nextUrl;
        if (i === MAX_REDIRECTS) throw new Error("Too many redirects");
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const html = await res.text();
      return { html, status: res.status, finalUrl: currentUrl, redirectChain };
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch and parse robots.txt for a given origin.
 */
async function fetchRobotsTxt(origin) {
  try {
    const robotsUrl = `${origin}/robots.txt`;
    await validateUrlSafety(robotsUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "Cache-Control": "no-cache, no-store", Pragma: "no-cache" },
    });
    clearTimeout(timer);
    if (!res.ok) return { accessible: false, content: null, disallowed: [] };
    const text = await res.text();
    // Only collect Disallow rules from the User-agent: * section
    const disallowed = [];
    let inWildcardSection = false;
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        inWildcardSection = trimmed.split(":").slice(1).join(":").trim() === "*";
      } else if (inWildcardSection && trimmed.toLowerCase().startsWith("disallow:")) {
        disallowed.push(trimmed.split(":").slice(1).join(":").trim());
      }
    }

    // Detect AI bot blocks
    const AI_BOTS = [
      // Search-relevant (block these = invisible to AI search)
      "GPTBot", "ChatGPT-User", "OAI-SearchBot",
      "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
      "PerplexityBot", "Perplexity-User",
      "Google-Extended",
      "Applebot-Extended",
      "Meta-ExternalAgent", "Meta-ExternalFetcher",
      "Amazonbot",    // Amazon Alexa / Rufus
      // Training-focused (allowing these = used for training)
      "CCBot",        // Common Crawl
      "Bytespider",   // ByteDance / TikTok
      "cohere-ai",    // Cohere
    ];
    const lines = text.split("\n");
    const blockedAiBots = [];
    const allowedAiBots = [];
    let currentAgent = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        currentAgent = trimmed.split(":").slice(1).join(":").trim();
      } else if (currentAgent && trimmed.toLowerCase().startsWith("disallow:")) {
        const path = trimmed.split(":").slice(1).join(":").trim();
        if (path === "/" || path === "/*") {
          const matched = AI_BOTS.find((b) => b.toLowerCase() === currentAgent.toLowerCase());
          if (matched) blockedAiBots.push(matched);
        }
      }
    }
    for (const bot of AI_BOTS) {
      if (!blockedAiBots.includes(bot)) allowedAiBots.push(bot);
    }
    // Check if wildcard blocks everything (including AI bots)
    let wildcardBlocksAll = false;
    let inWildcard = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        inWildcard = trimmed.split(":").slice(1).join(":").trim() === "*";
      } else if (inWildcard && trimmed.toLowerCase().startsWith("disallow:")) {
        const path = trimmed.split(":").slice(1).join(":").trim();
        if (path === "/" || path === "/*") wildcardBlocksAll = true;
      }
    }

    // Sitemap directive (Moz, Google Search Central)
    const sitemapDirectives = lines
      .filter((l) => l.trim().toLowerCase().startsWith("sitemap:"))
      .map((l) => l.split(":").slice(1).join(":").trim());

    return { accessible: true, content: text, disallowed, blockedAiBots, allowedAiBots, wildcardBlocksAll, sitemapDirectives };
  } catch (err) {
    console.warn("[Crawler] Failed to fetch robots.txt:", err.message);
    return { accessible: false, content: null, disallowed: [], blockedAiBots: [], allowedAiBots: [], wildcardBlocksAll: false, sitemapDirectives: [] };
  }
}

/**
 * Load HTML into cheerio and return the $ instance.
 */
function loadHtml(html) {
  return cheerio.load(html);
}

/**
 * Check if a JSON-LD entity matches a given @type (handles string or array @type).
 */
function entityHasType(entity, type) {
  const t = entity["@type"];
  if (Array.isArray(t)) return t.includes(type);
  return t === type;
}

/**
 * Parse HTML and extract structured page data.
 */
function parsePage(html, url) {
  const $ = cheerio.load(html);

  // Title
  const title = $("title").first().text().trim();

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || "";

  // H1 tags
  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get();

  // All headings hierarchy
  const headings = {};
  for (let level = 1; level <= 6; level++) {
    const tags = $(`h${level}`)
      .map((_, el) => $(el).text().trim())
      .get();
    if (tags.length) headings[`h${level}`] = tags;
  }

  // Images
  const images = [];
  $("img").each((_, el) => {
    images.push({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt") || null,  // Keep || null â€” empty alt="" is intentional for decorative images
      srcset: $(el).attr("srcset") || "",
      sizes: $(el).attr("sizes") || "",
      width: $(el).attr("width") || "",
    });
  });
  // alt="" (empty string) is intentional for decorative images (WAI) â€” only flag truly missing alt
  const imagesWithoutAlt = images.filter((img) => img.alt === null);

  // Picture elements
  const pictureElements = [];
  $("picture").each((_, el) => {
    const sources = [];
    $(el).find("source").each((_, s) => {
      sources.push({
        srcset: $(s).attr("srcset") || "",
        type: $(s).attr("type") || "",
        media: $(s).attr("media") || "",
      });
    });
    pictureElements.push({ sources });
  });

  // Link icons
  const linkIcons = [];
  $('link[rel*="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
    linkIcons.push({ rel: $(el).attr("rel") || "", href: $(el).attr("href") || "" });
  });

  // Resource URLs
  const resourceUrls = [];
  $("img, script, link[rel='stylesheet'], link[rel='preload'], iframe, video, audio").each((_, el) => {
    const resourceUrl = $(el).attr("src") || $(el).attr("href") || "";
    const rel = $(el).attr("rel") || "";
    const tag = el.tagName.toLowerCase();
    if (resourceUrl) resourceUrls.push({ url: resourceUrl, tag, rel });
  });

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href") || null;

  // Open Graph
  const og = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property").replace("og:", "");
    og[prop] = $(el).attr("content") || "";
  });

  // JSON-LD structured data
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      jsonLd.push(JSON.parse($(el).html()));
    } catch {
      // invalid JSON-LD
    }
  });

  // Flatten @graph entries and collect all schema entities
  const jsonLdEntities = [];
  for (const item of jsonLd) {
    if (Array.isArray(item["@graph"])) {
      jsonLdEntities.push(...item["@graph"]);
    } else {
      jsonLdEntities.push(item);
    }
  }

  // Viewport
  const viewport = $('meta[name="viewport"]').attr("content") || null;

  // Hreflang
  const hreflang = $('link[rel="alternate"][hreflang]')
    .map((_, el) => ({
      lang: $(el).attr("hreflang"),
      href: $(el).attr("href"),
    }))
    .get();

  // Internal and external links
  const origin = new URL(url).origin;
  const links = $("a[href]")
    .map((_, el) => $(el).attr("href"))
    .get();
  const internalLinks = links.filter((href) => {
    try {
      const u = new URL(href, url);
      return u.origin === origin;
    } catch {
      return href.startsWith("/") || href.startsWith("#");
    }
  });
  const externalLinks = links.filter((href) => {
    try {
      const u = new URL(href, url);
      return u.origin !== origin;
    } catch {
      return false;
    }
  });

  // SSL (derived from URL)
  const isHttps = url.startsWith("https://");

  // FAQ detection â€” multi-language class/id patterns
  const hasFaqSchema = jsonLdEntities.some((e) => entityHasType(e, "FAQPage"));
  const faqPatterns = $("dt, .faq, [class*='faq'], [id*='faq'], [class*='vraag'], [id*='vraag'], [class*='veelgestelde'], [class*='preguntas'], [class*='foire'], [class*='hÃ¤ufig']").length;

  // Content blocks for LLM analysis
  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 20);

  // Freshness signals
  const timeElements = $("time")
    .map((_, el) => $(el).attr("datetime") || $(el).text())
    .get();
  const dateModified = jsonLdEntities.find((j) => j.dateModified)?.dateModified || null;

  // Trust signals â€” multi-language text + class detection
  const bodyText = $("body").text().toLowerCase();
  const testimonialWords = ["testimonial", "review", "getuigenis", "beoordeling", "referentie", "aanbeveling", "tÃ©moignage", "avis", "bewertung", "testimonio", "reseÃ±a"];
  const hasTestimonials =
    testimonialWords.some(w => bodyText.includes(w)) ||
    $('[class*="testimonial"], [class*="review"], [id*="testimonial"], [class*="getuigenis"], [class*="referentie"], [class*="avis"], [class*="bewertung"]')
      .length > 0;
  // Multi-language social proof class detection
  const hasSocialProof =
    $('[class*="logo"], [class*="client"], [class*="partner"], [class*="klant"], [class*="kunde"], [class*="partenaire"], [class*="proof"], [class*="metric"], [class*="stats"], [class*="counter"]').length > 0;

  // CTA detection â€” multi-strategy: semantic, class-based, and visual heuristics
  // Strategy 1: Explicit CTA/button class names
  // Covers: Bootstrap, Bulma, Foundation, Materialize, Semantic UI, UIKit, DaisyUI,
  // Ant Design, Chakra UI, MUI, Mantine, Element Plus, Carbon, Vuetify, Ghost, HubSpot,
  // Squarespace, WordPress (core, Elementor, Divi, Avada, Beaver Builder, WPBakery, Kadence, Astra),
  // Shopify, Webflow, Drupal, Joomla, Adobe Spectrum, PrimeVue/React
  const classSelectors = [
    'a[class*="cta"], a[class*="btn"], button[class*="cta"], button[class*="btn"]',
    'a[class*="button"], button[class*="button"]',
    'a[class*="Button"], button[class*="Button"]',
    // Tailwind / utility-class styled buttons (bg-color + padding + rounded)
    'a[class*="bg-"][class*="px-"][class*="rounded"]',
    'button[class*="bg-"][class*="px-"][class*="rounded"]',
    // Tailwind with p- (padding shorthand) instead of px-
    'a[class*="bg-"][class*=" p-"][class*="rounded"]',
    'button[class*="bg-"][class*=" p-"][class*="rounded"]',
    // Shopify product forms
    'a[class*="add-to-cart"], button[class*="add-to-cart"]',
    'a[class*="cart-button"], button[class*="cart-button"]',
  ].join(", ");
  // Strategy 2: Semantic HTML (role, type, <button> elements, web components)
  const semanticSelectors = [
    'a[role="button"]',
    '[role="button"] a',
    'button[type="submit"]',
    'input[type="submit"]',
    // Web components: Shoelace, Ionic, Vaadin, FAST
    'sl-button',
    'ion-button',
    'vaadin-button',
    'fast-button',
    'md-filled-button', 'md-outlined-button', 'md-text-button',
    // Wix data-testid (obfuscated classes)
    '[data-testid="buttonElement"]',
    '[data-testid="linkElement"]',
  ].join(", ");
  // Strategy 3: All buttons with visible text (framework-agnostic)
  const allButtons = $("button")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0 && t.length < 80);
  // Strategy 4: Links with inline button-like styles (any framework)
  const inlineStyledCtas = [];
  $("a[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const text = $(el).text().trim();
    // Inline styles with background-color + padding = visually a button
    if (text.length > 0 && text.length < 80 && /background(-color)?:\s*(?!transparent|none)/.test(style) && /padding/.test(style)) {
      inlineStyledCtas.push(text);
    }
  });

  const ctaSet = new Set();
  $([classSelectors, semanticSelectors].join(", "))
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0 && t.length < 80)
    .forEach((t) => ctaSet.add(t));
  allButtons.forEach((t) => ctaSet.add(t));
  inlineStyledCtas.forEach((t) => ctaSet.add(t));
  const ctas = [...ctaSet];

  // --- New signals for enhanced checks ---

  // Meta robots directive
  const metaRobots = $('meta[name="robots"]').attr("content")?.trim().toLowerCase() || "";

  // Author & expertise signals
  const hasAuthorSchema = jsonLdEntities.some((e) => entityHasType(e, "Person") && (e.jobTitle || e.knowsAbout));
  const authorBioElements = $('[class*="author"], [class*="bio"], [class*="byline"], [id*="author"], [rel="author"]').length;
  const authorName = jsonLdEntities.find((e) => entityHasType(e, "Person"))?.name ||
    $('[class*="author"] [class*="name"], .byline, [rel="author"]').first().text().trim() || null;

  // Structured data completeness
  const orgEntity = jsonLdEntities.find((e) =>
    ["Organization", "LocalBusiness", "ProfessionalService"].some((t) => entityHasType(e, t))
  );
  const articleEntity = jsonLdEntities.find((e) => entityHasType(e, "Article") || entityHasType(e, "BlogPosting") || entityHasType(e, "NewsArticle"));
  const schemaCompleteness = {
    org: orgEntity ? {
      hasName: !!orgEntity.name,
      hasUrl: !!orgEntity.url,
      hasLogo: !!orgEntity.logo,
      hasSameAs: Array.isArray(orgEntity.sameAs) && orgEntity.sameAs.length > 0,
      hasContactPoint: !!orgEntity.contactPoint,
    } : null,
    article: articleEntity ? {
      hasAuthor: !!articleEntity.author,
      hasDatePublished: !!articleEntity.datePublished,
      hasDateModified: !!articleEntity.dateModified,
      hasHeadline: !!articleEntity.headline,
      hasImage: !!articleEntity.image,
    } : null,
  };

  // sameAs links (knowledge graph connections)
  const sameAsLinks = jsonLdEntities.flatMap((e) =>
    Array.isArray(e.sameAs) ? e.sameAs : (e.sameAs ? [e.sameAs] : [])
  );

  // Lists, tables, definition lists (content extractability)
  const listCount = $("ul, ol").length;
  const tableCount = $("table").length;
  const definitionListCount = $("dl").length;

  // Answer capsules: concise, quotable paragraphs after H2/H3 headings
  // Language-agnostic: any concise paragraph (10-60 words) directly after a heading
  // that makes a statement (not a question) is a potential AI-quotable capsule
  let answerCapsules = 0;
  $("h2, h3").each((_, el) => {
    const nextP = $(el).next("p");
    if (nextP.length) {
      const text = nextP.text().trim();
      const cjkText = isCJK(text);
      // CJK: use character count (10-60 words â‰ˆ 15-90 CJK chars)
      const wc = cjkText ? countCJKWords(text) : text.split(/\s+/).length;
      if (wc >= 10 && wc <= 60) {
        // Exclude question-only paragraphs (including CJK ï¼Ÿ) and navigation-style text
        const isQuestion = /^[^.!ã€‚ï¼]*[?ï¼Ÿ]\s*$/.test(text);
        const isTooShort = text.length < (cjkText ? 15 : 40);
        if (!isQuestion && !isTooShort) {
          answerCapsules++;
        }
      }
    }
  });

  // Source attribution: citations, references, blockquotes
  const blockquoteCount = $("blockquote").length;
  const citeCount = $("cite").length;
  const referenceElements = $('[class*="source"], [class*="reference"], [class*="citation"], [class*="footnote"]').length;
  // External links within content paragraphs (not nav)
  const contentExternalLinks = $("p a[href], article a[href], .content a[href], main a[href]")
    .filter((_, el) => {
      const href = $(el).attr("href") || "";
      try { return new URL(href, url).origin !== origin; } catch { return false; }
    }).length;

  // Video content detection
  const videoElements = $("video").length;
  // Expanded video embed detection (all major platforms)
  const videoEmbeds = $('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"], iframe[src*="loom"], iframe[src*="dailymotion"], iframe[src*="vidyard"], iframe[src*="brightcove"], iframe[src*="bunny.net"], iframe[src*="streamable"], iframe[src*="twitch"]').length;
  const videoSchemaCount = jsonLdEntities.filter((e) => entityHasType(e, "VideoObject")).length;
  const hasVideo = videoElements > 0 || videoEmbeds > 0;

  // Review / Rating presence â€” check top-level AND nested aggregateRating/review
  const hasReviewSchema = jsonLdEntities.some((e) =>
    entityHasType(e, "AggregateRating") || entityHasType(e, "Review")
    || !!e.aggregateRating || !!e.review
  );
  // Multi-language rating element detection
  const ratingElements = $('[class*="star"], [class*="rating"], [class*="review-score"], [class*="ster"], [class*="waardering"], [class*="bewertung"], [class*="Ã©toile"], [class*="estrella"], [class*="note-"], [class*="score"]').length;

  // Contact information
  const mailtoLinks = $('a[href^="mailto:"]').length;
  const telLinks = $('a[href^="tel:"]').length;
  // Multi-language contact form detection
  const hasContactForm = $('form[class*="contact"], form[id*="contact"], form[action*="contact"], form[class*="kontakt"], form[class*="kontact"], form[id*="kontakt"], form[id*="kontact"], form[class*="contatti"], form[id*="contatti"], form[class*="contacto"], form[id*="contacto"], form[class*="formulaire"], form[id*="formulaire"], form[action*="contatti"], form[action*="contacto"]').length > 0
    || ($("form").length > 0 && (mailtoLinks > 0 || telLinks > 0));
  const hasContactSchema = jsonLdEntities.some((e) => e.contactPoint || e.telephone || e.email);

  // Privacy & security signals
  // Multi-language privacy/terms/cookie detection
  const hasPrivacyLink = $('a[href*="privacy"], a[href*="Privacy"], a[href*="privacybeleid"], a[href*="datenschutz"], a[href*="privacidad"], a[href*="confidentialit"], a[href*="informativa"], a[href*="privacidade"]').length > 0;
  const hasTermsLink = $('a[href*="terms"], a[href*="Terms"], a[href*="tos"], a[href*="voorwaarden"], a[href*="agb"], a[href*="nutzungsbedingungen"], a[href*="condiciones"], a[href*="conditions-generales"], a[href*="condizioni"], a[href*="termos"], a[href*="termini"]').length > 0;
  const hasCookieConsent = $('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"], [class*="cookiemelding"], [class*="rgpd"], [class*="ccpa"], [id*="gdpr"]').length > 0;

  // Cookie policy link detection â€” inside cookie consent element or footer
  const cookieConsentEls = $('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"], [class*="cookiemelding"], [class*="rgpd"], [class*="ccpa"], [id*="gdpr"]');
  const hasCookiePolicyLink = cookieConsentEls.find('a[href*="cookie"]').length > 0
    || cookieConsentEls.find('a').filter((_, el) => /cookie\s*polic/i.test($(el).text())).length > 0
    || $('footer a[href*="cookie"]').length > 0
    || $('footer a').filter((_, el) => /cookie\s*polic/i.test($(el).text())).length > 0;

  const hasTrustBadges = $('[class*="badge"], [class*="seal"], [class*="secure"], [class*="trust-badge"]').length > 0;

  // HTML lang attribute (W3C, Bing, Google Search Central)
  const htmlLang = $("html").attr("lang")?.trim() || null;

  // Semantic HTML landmarks (W3C)
  const semanticLandmarks = {
    nav: $("nav").length,
    main: $("main").length,
    article: $("article").length,
    header: $("header").length,
    footer: $("footer").length,
    aside: $("aside").length,
    section: $("section").length,
  };

  // Breadcrumb schema (Google Search Central, Schema.org)
  // Check both JSON-LD and microdata breadcrumbs
  const hasBreadcrumbSchema = jsonLdEntities.some((e) => entityHasType(e, "BreadcrumbList"))
    || $('[itemtype*="BreadcrumbList"]').length > 0;

  // WebSite / WebPage schema (Schema.org)
  const hasWebSiteSchema = jsonLdEntities.some((e) => entityHasType(e, "WebSite"));
  const hasWebPageSchema = jsonLdEntities.some((e) => entityHasType(e, "WebPage"));
  const hasSearchAction = jsonLdEntities.some((e) => {
    if (!entityHasType(e, "WebSite") || !e.potentialAction) return false;
    const actions = Array.isArray(e.potentialAction) ? e.potentialAction : [e.potentialAction];
    return actions.some((a) => a["@type"] === "SearchAction");
  });

  // HowTo schema (Schema.org)
  const hasHowToSchema = jsonLdEntities.some((e) => entityHasType(e, "HowTo"));

  // Speakable schema (Schema.org â€” marks content for voice/AI)
  const hasSpeakableSchema = jsonLdEntities.some((e) => !!e.speakable);

  // Lazy loading images (web.dev)
  // Count native lazy loading + data-src patterns (common in lazy-load libraries)
  const lazyImages = $('img[loading="lazy"]').length
    + $('img[data-src]:not([loading="lazy"])').length
    + $('img[data-lazy]:not([loading="lazy"])').length;
  const totalImagesForLazy = images.length;

  // Preconnect hints (web.dev)
  const preconnectCount = $('link[rel="preconnect"]').length;

  // Font-display strategy (web.dev)
  // Check inline styles, Google Fonts display=swap, and Next.js font preloading
  let hasFontDisplaySwap = false;
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    if (css.includes("font-display") && (css.includes("swap") || css.includes("optional"))) {
      hasFontDisplaySwap = true;
    }
  });
  if (!hasFontDisplaySwap) {
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("display=swap")) hasFontDisplaySwap = true;
    });
  }
  // Framework font optimization: modern frameworks preload self-hosted fonts
  // and apply font-display in CSS chunks not visible in raw HTML
  if (!hasFontDisplaySwap) {
    const preloadedFonts = $('link[rel="preload"][as="font"]').length;
    if (preloadedFonts > 0) {
      // Detect framework by asset path patterns
      const frameworkPatterns = [
        '/_next/',       // Next.js
        '/_nuxt/',       // Nuxt
        '/_astro/',      // Astro
        '/_app/',        // SvelteKit
        '/build/',       // Remix / Laravel Vite / Qwik
        '/assets/',      // Generic Vite-based (SvelteKit, SolidStart, etc.)
        '/static/',      // Gatsby, CRA, Hugo, 11ty
        '/__gatsby/',    // Gatsby
        '/dist/',        // Angular CLI / Ember
        '/bundles/',     // Webpack (various frameworks)
      ];
      const allLinks = $('link, script').map((_, el) => $(el).attr("href") || $(el).attr("src") || "").get();
      const hasFramework = frameworkPatterns.some((p) => allLinks.some((l) => l.includes(p)));
      // Also accept any preloaded font with crossorigin (self-hosted = framework-managed)
      const hasCrossOriginFonts = $('link[rel="preload"][as="font"][crossorigin]').length > 0;
      if (hasFramework || hasCrossOriginFonts) {
        hasFontDisplaySwap = true;
      }
    }
  }

  // ARIA landmarks for accessibility (W3C, web.dev)
  const ariaLandmarks = $('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"], [role="search"]').length;

  // Word count for thin content detection
  // CJK text doesn't use spaces between words â€” use character-based estimation
  const allVisibleText = $("p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, blockquote")
    .map((_, el) => $(el).text().trim())
    .get()
    .join(" ");
  const wordCount = isCJK(allVisibleText)
    ? countCJKWords(allVisibleText)
    : allVisibleText.split(/\s+/).filter((w) => w.length > 0).length;

  // Content-to-code ratio â€” strip scripts/styles/SVGs for a fair comparison
  const $clean = cheerio.load(html);
  $clean("script, style, noscript, svg, iframe").remove();
  const cleanHtml = $clean("body").html() || "";
  const cleanBodyText = $clean("body").text().replace(/\s+/g, " ").trim();
  const lang = $("html").attr("lang") || "";
  const textLength = cleanBodyText.length;
  const htmlLength = cleanHtml.length;
  const contentToCodeRatio = htmlLength > 0 ? (textLength / htmlLength) * 100 : 0;

  // Heading hierarchy analysis
  const headingOrder = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headingOrder.push(parseInt(el.tagName.charAt(1), 10));
  });

  // datePublished for freshness comparison
  const datePublished = jsonLdEntities.find((j) => j.datePublished)?.datePublished || null;
  // Multi-language "last updated" text detection
  const hasLastUpdatedText = bodyText.includes("last updated") || bodyText.includes("updated on") || bodyText.includes("last reviewed")
    || bodyText.includes("laatst bijgewerkt") || bodyText.includes("laatst gewijzigd") || bodyText.includes("bijgewerkt op")
    || bodyText.includes("derniÃ¨re mise Ã  jour") || bodyText.includes("mis Ã  jour le") || bodyText.includes("zuletzt aktualisiert")
    || bodyText.includes("Ãºltima actualizaciÃ³n") || bodyText.includes("actualizado el");

  // Multi-language detection
  const langPathPattern = /^https?:\/\/[^/]+\/(?:en|de|fr|es|it|pt|nl|ja|zh|ko|ru|ar|sv|da|no|fi|pl|cs|tr|uk|el|he|th|vi|id|ms|hi|bn|ro|hu|bg|sk|sl|hr|lt|lv|et|mt|ga|cy|eu|ca|gl|sq|sr|bs|mk|is)(?:[-_][a-z]{2,4})?\//i;
  const langSubdomainPattern = /^https?:\/\/(?:en|de|fr|es|it|pt|nl|ja|zh|ko|ru|ar|sv|da|no|fi|pl|cs|tr|uk|el|he|th|vi|id|ms|hi|bn|ro|hu|bg|sk|sl|hr|lt|lv|et|mt|ga|cy|eu|ca|gl|sq|sr|bs|mk|is)[-.]?\./i;
  const languageSwitcher = $('[class*="lang"], [class*="language"], [id*="lang"], [id*="language"], [class*="locale"], [id*="locale"]').length;
  const langLinks = links.filter((href) => {
    try {
      const full = new URL(href, url).href;
      return langPathPattern.test(full) || langSubdomainPattern.test(full);
    } catch { return false; }
  });
  const hasMultipleLanguages = hreflang.length > 0 || languageSwitcher > 0 || langLinks.length >= 2;

  // --- Marketing extraction fields ---

  // Logo detection
  const logoDetected = { found: false, location: "none", type: "none" };
  const headerEl = $("header, nav, [role='banner']");
  const logoSelectors = [
    'img[class*="logo"]', 'img[id*="logo"]', 'img[alt*="logo" i]',
    'img[src*="logo"]', 'img.custom-logo', 'img.site-header__logo',
    'svg[class*="logo"]', 'svg[aria-label*="logo" i]',
    '[class*="site-title-logo"]', '[data-testid*="logo"]',
  ];
  for (const sel of logoSelectors) {
    if (headerEl.find(sel).length > 0) {
      logoDetected.found = true;
      logoDetected.location = "header";
      logoDetected.type = sel.startsWith("svg") ? "svg" : "image";
      break;
    }
  }
  if (!logoDetected.found) {
    for (const sel of logoSelectors) {
      if ($(sel).length > 0) {
        logoDetected.found = true;
        logoDetected.location = "page";
        logoDetected.type = sel.startsWith("svg") ? "svg" : "image";
        break;
      }
    }
  }

  // Loaded fonts
  const loadedFonts = [];
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    // Match all family= occurrences (CSS2 API uses & or | as separator)
    const familyMatches = [...href.matchAll(/family=([^&|#]+)/g)];
    for (const m of familyMatches) {
      const name = decodeURIComponent(m[1].split(":")[0].replace(/\+/g, " ")).trim();
      if (name && !loadedFonts.includes(name)) loadedFonts.push(name);
    }
  });
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    const fontFaceMatches = css.matchAll(/font-family:\s*['"]?([^'";,}]+)/gi);
    for (const m of fontFaceMatches) {
      const name = m[1].trim();
      if (name && !loadedFonts.includes(name)) loadedFonts.push(name);
    }
  });

  // Form fields
  const formFields = [];
  $("form").each((_, form) => {
    const isSearch = $(form).attr("role") === "search" ||
      ($(form).find("input:not([type='hidden'])").length === 1 &&
       $(form).find("input[type='search'], input[type='text']").length === 1);
    let visibleCount = 0;
    $(form).find("input, select, textarea").each((_, field) => {
      const type = $(field).attr("type") || "";
      const style = $(field).attr("style") || "";
      if (type === "hidden") return;
      if (style.includes("display:none") || style.includes("display: none")) return;
      if (style.includes("visibility:hidden") || style.includes("visibility: hidden")) return;
      if ($(field).attr("aria-hidden") === "true") return;
      if (type === "submit" || type === "button") return;
      visibleCount++;
    });
    formFields.push({ visibleCount, isSearch, action: $(form).attr("action") || "" });
  });

  // Inline color pairs
  const inlineColorPairs = [];
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
    const bgMatch = style.match(/background-color:\s*([^;]+)/i);
    if (colorMatch && bgMatch) {
      inlineColorPairs.push({
        color: colorMatch[1].trim(),
        background: bgMatch[1].trim(),
        tag: el.tagName.toLowerCase(),
      });
    }
  });

  // CTA elements with position metadata
  const ctaElements = [];
  $([classSelectors, semanticSelectors].join(", ")).each((_, el) => {
    const text = $(el).text().trim();
    if (!text || text.length >= 80) return;
    const inHeader = $(el).closest("header, nav, [role='banner']").length > 0;
    const section = $(el).closest("section, [class*='hero'], [class*='banner'], main > div").first();
    const sectionId = section.attr("id") || section.attr("class")?.split(" ")[0] || "";
    ctaElements.push({ text, inHeader, sectionId });
  });

  // Trust elements with section context
  const trustSelectors = [
    '[class*="testimonial"]', '[class*="review"]', '[class*="trust"]',
    '[class*="badge"]', '[class*="guarantee"]', '[class*="rating"]',
    '[class*="proof"]', '[class*="client-logo"]', '[class*="partner"]',
    '[class*="bewertung"]', '[class*="avis"]', '[class*="reseÃ±a"]',
    '[class*="recensione"]', '[class*="depoimento"]',
  ];
  const trustElements = [];
  $(trustSelectors.join(", ")).each((_, el) => {
    const section = $(el).closest("section, [class*='hero'], main > div").first();
    const sectionId = section.attr("id") || section.attr("class")?.split(" ")[0] || "";
    const type = $(el).attr("class") || "";
    trustElements.push({ type, sectionId });
  });

  // Paywall signals
  const paywallClasses = [
    "paywall", "premium-content", "subscriber-only", "login-required",
    "mepr-unauthorized-message", "mepr-login-form",
    "rcp-restricted-content-message", "wc-memberships-content-restricted",
    "customer-login-form",
  ];
  const hasPaywallClasses = paywallClasses.some((cls) => $(`[class*="${cls}"]`).length > 0);
  const hasLoginForm = $("form").filter((_, form) =>
    $(form).find('input[type="password"]').length > 0 ||
    ($(form).attr("action") || "").match(/login|signin|sign-in/i)
  ).length > 0;
  const paywallSignals = { hasPaywallClasses, hasLoginForm };

  return {
    url,
    title,
    metaDescription,
    h1s,
    headings,
    images: {
      total: images.length,
      withoutAlt: imagesWithoutAlt.length,
      withoutAltItems: imagesWithoutAlt.slice(0, 15).map(img => img.src).filter(Boolean),
      allItems: images.slice(0, 30).map(img => ({ src: img.src, alt: img.alt, srcset: img.srcset, sizes: img.sizes, width: img.width })),
    },
    canonical,
    og,
    jsonLd,
    jsonLdEntities,
    viewport,
    hreflang,
    links: {
      internal: internalLinks.length,
      internalUrls: internalLinks.map((href) => {
        try { return new URL(href, url).href.replace(/#.*$/, "").replace(/\/$/, ""); } catch { return null; }
      }).filter(Boolean),
      external: externalLinks.length,
      externalUrls: externalLinks.slice(0, 20).map((href) => {
        try { return new URL(href, url).href; } catch { return href; }
      }),
      total: links.length,
    },
    isHttps,
    hasFaqSchema,
    faqPatterns,
    paragraphs,
    timeElements,
    dateModified,
    datePublished,
    hasLastUpdatedText,
    hasTestimonials,
    hasSocialProof,
    ctas,
    // New signals
    metaRobots,
    hasAuthorSchema,
    authorBioElements,
    authorName,
    schemaCompleteness,
    sameAsLinks,
    listCount,
    tableCount,
    definitionListCount,
    answerCapsules,
    blockquoteCount,
    citeCount,
    referenceElements,
    contentExternalLinks,
    hasVideo,
    videoElements,
    videoEmbeds,
    videoSchemaCount,
    hasReviewSchema,
    ratingElements,
    mailtoLinks,
    telLinks,
    hasContactForm,
    hasContactSchema,
    hasPrivacyLink,
    hasTermsLink,
    hasCookieConsent,
    hasCookiePolicyLink,
    hasTrustBadges,
    wordCount,
    contentToCodeRatio,
    headingOrder,
    hasMultipleLanguages,
    // Extra checks signals
    htmlLang,
    semanticLandmarks,
    hasBreadcrumbSchema,
    hasWebSiteSchema,
    hasWebPageSchema,
    hasSearchAction,
    hasHowToSchema,
    hasSpeakableSchema,
    lazyImages,
    totalImagesForLazy,
    preconnectCount,
    hasFontDisplaySwap,
    ariaLandmarks,
    visibleText: cleanBodyText,
    lang,
    // Expanded extraction fields
    pictureElements,
    linkIcons,
    resourceUrls,
    logoDetected,
    loadedFonts,
    formFields,
    inlineColorPairs,
    ctaElements,
    trustElements,
    paywallSignals,
    htmlSize: Buffer.byteLength(html, "utf8"),
  };
}

/**
 * Fetch and parse sitemap.xml for a given origin.
 * Follows sitemap index files (up to 5 sub-sitemaps).
 * Returns { urls: string[], lastmodMap: Map<string,string> } â€” same-origin only.
 * lastmodMap maps normalized URL â†’ ISO lastmod string (if present in the sitemap).
 */
async function fetchSitemap(origin) {
  const urls = new Set();
  const lastmodMap = new Map();

  // Treat www and non-www as equivalent (e.g., wrapgraphics.be vs www.wrapgraphics.be)
  function isSameHost(urlOrigin) {
    try {
      const a = new URL(origin).hostname.replace(/^www\./, "");
      const b = new URL(urlOrigin).hostname.replace(/^www\./, "");
      return a === b;
    } catch { return false; }
  }

  async function parseSitemapUrl(sitemapUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Trivium/1.0 (open-source web audit tool)",
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });
      clearTimeout(timer);
      if (!res.ok) return;
      const contentType = res.headers.get("content-type") || "";
      // Skip if response is HTML (e.g., redirect to homepage)
      if (contentType.includes("text/html")) return;
      const text = await res.text();
      // Quick check: must look like XML
      if (!text.trim().startsWith("<?xml") && !text.includes("<urlset") && !text.includes("<sitemapindex")) return;
      const $ = cheerio.load(text, { xmlMode: true });

      // Check if this is a sitemap index
      const sitemapLocs = $("sitemapindex sitemap loc")
        .map((_, el) => $(el).text().trim())
        .get();

      if (sitemapLocs.length > 0) {
        // Follow up to 5 sub-sitemaps â€” same host (www/non-www) to prevent SSRF
        const toFollow = sitemapLocs
          .filter((loc) => isSameHost(loc))
          .slice(0, 5);
        await Promise.all(toFollow.map((loc) => parseSitemapUrl(loc)));
        return;
      }

      // Regular sitemap â€” extract <loc> URLs + <lastmod>
      $("urlset url").each((_, el) => {
        const loc = $(el).find("loc").first().text().trim();
        const lastmod = $(el).find("lastmod").first().text().trim();
        try {
          const u = new URL(loc);
          if (isSameHost(u.origin)) {
            const norm = u.href.replace(/#.*$/, "").replace(/\/$/, "");
            urls.add(norm);
            if (lastmod) lastmodMap.set(norm, lastmod);
          }
        } catch { /* skip invalid */ }
      });
    } catch (err) { console.warn("[Crawler] Sitemap fetch error:", err.message); }
  }

  // Try common sitemap locations
  const triedSitemaps = new Set();
  for (const path of [
    "/sitemap.xml",           // Standard
    "/wp-sitemap.xml",        // WordPress core (WP 5.5+)
    "/sitemap_index.xml",     // Yoast / RankMath
    "/pub/sitemap.xml",       // Magento (pub directory)
    "/1_index_sitemap.xml",   // PrestaShop
    "/component/jmap/sitemap.xml", // Joomla JMap
  ]) {
    const sitemapUrl = `${origin}${path}`;
    triedSitemaps.add(sitemapUrl);
    await parseSitemapUrl(sitemapUrl);
    if (urls.size > 0) break; // found pages, stop trying
  }

  // Also check robots.txt for Sitemap: directives
  if (urls.size === 0) {
    try {
      const robotsRes = await fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": "Trivium/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        const sitemapMatches = robotsText.match(/^Sitemap:\s*(.+)$/gmi) || [];
        for (const match of sitemapMatches.slice(0, 3)) {
          const sitemapUrl = match.replace(/^Sitemap:\s*/i, "").trim();
          if (sitemapUrl && !triedSitemaps.has(sitemapUrl)) {
            await parseSitemapUrl(sitemapUrl);
          }
        }
      }
    } catch {}
  }

  return { urls: [...urls], lastmodMap };
}

/**
 * Discover pages on a site up to `pageLimit`.
 * Strategy: sitemap first, then BFS crawl of internal links.
 * Returns array of URLs with primaryUrl first.
 */
async function discoverPages(primaryUrl, pageLimit, maxDepth = Infinity, { includePaths, excludePaths } = {}) {
  const origin = new URL(primaryUrl).origin;
  const normalizedPrimary = primaryUrl.replace(/#.*$/, "").replace(/\/$/, "");

  if (pageLimit <= 1) return [normalizedPrimary];

  // 1. Try sitemap
  const { urls: sitemapUrls } = await fetchSitemap(origin);

  const seen = new Set();
  const queue = []; // { url, depth }

  // Always put primary URL first (no filter check)
  seen.add(normalizedPrimary);
  queue.push({ url: normalizedPrimary, depth: 0 });

  // Add sitemap URLs (depth 1 â€” one level from root)
  for (const u of sitemapUrls) {
    if (/\.(txt|pdf|xml|json|csv|zip)$/i.test(u)) continue;
    if (!seen.has(u) && seen.size < pageLimit && matchesPathFilter(u, includePaths, excludePaths)) {
      seen.add(u);
      queue.push({ url: u, depth: 1 });
    }
  }

  // 2. If we still have room, BFS crawl from discovered pages
  let crawlIndex = 0;
  while (crawlIndex < queue.length && seen.size < pageLimit) {
    const { url, depth } = queue[crawlIndex++];
    if (depth >= maxDepth) continue; // respect depth limit
    try {
      const { html } = await fetchPage(url);
      const pageData = parsePage(html, url);
      for (const link of pageData.links.internalUrls) {
        if (!seen.has(link) && seen.size < pageLimit) {
          // Skip non-page resources
          if (/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|xml|json|txt|csv)$/i.test(link)) continue;
          // Apply path filter
          if (!matchesPathFilter(link, includePaths, excludePaths)) continue;
          seen.add(link);
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    } catch (err) { console.warn("[Crawler] BFS crawl skip:", url, err.message); }

    // Limit BFS link-discovery fetches to avoid hammering the server
    // With sitemap: stop after 3 pages (sitemap already has most URLs)
    // Without sitemap: crawl up to 10 pages to find more links
    const maxCrawlPages = sitemapUrls.length > 0 ? 3 : 10;
    if (crawlIndex >= maxCrawlPages) break;
  }

  return queue.map(q => q.url).slice(0, pageLimit);
}

module.exports = { fetchPage, fetchRobotsTxt, parsePage, loadHtml, fetchSitemap, discoverPages, entityHasType };
