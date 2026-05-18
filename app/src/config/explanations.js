// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Rich explanations for each check type.
 * Keyed by check label. Each entry has:
 *   why       — why this matters
 *   howToFix  — actionable steps to fix it
 *   learnMore — one-line hint or external reference
 */
const explanations = {
  // ── SEO ──
  "Title Tag": {
    why: "The title tag is the single most influential on-page SEO element. It appears as the clickable headline in search results and browser tabs. Search engines heavily weight title tags when determining page relevance.",
    howToFix: [
      "Keep between 50–60 characters to avoid truncation in search results",
      "Place your primary keyword near the beginning",
      "Make it unique and descriptive — avoid generic titles like 'Home'",
      "Include your brand name at the end, separated by a pipe or dash",
    ],
    learnMore: "Google may rewrite titles if they don't match page content well.",
  },
  "Meta Description": {
    why: "Meta descriptions appear as the snippet below your title in search results. While not a direct ranking factor, a compelling description significantly improves click-through rate (CTR), which indirectly affects rankings.",
    howToFix: [
      "Write 120–160 characters that summarize the page's value",
      "Include your primary keyword naturally — Google bolds matching terms",
      "Add a clear call-to-action (e.g., 'Learn more', 'Get started')",
      "Make each page's description unique",
    ],
    learnMore: "Google sometimes generates its own snippet if the meta description doesn't match the search query.",
  },
  "H1 Tag": {
    why: "The H1 is your page's main heading and tells both users and search engines what the page is about. It sets the content hierarchy and is one of the first things crawlers evaluate.",
    howToFix: [
      "Use exactly one H1 per page",
      "Include your primary target keyword",
      "Make it descriptive and unique — different from the title tag",
      "Ensure proper heading hierarchy (H1 -> H2 -> H3)",
    ],
    learnMore: "Multiple H1 tags dilute the heading signal and confuse content hierarchy.",
  },
  "Image Alt Tags": {
    why: "Alt text makes images accessible to screen readers and helps search engines understand image content. Images with good alt text can rank in Google Image Search, driving additional traffic.",
    howToFix: [
      "Add descriptive alt text to every meaningful image",
      "Include relevant keywords naturally — avoid keyword stuffing",
      "Keep alt text under 125 characters",
      "Use empty alt='' for purely decorative images",
    ],
    learnMore: "Alt text is required for WCAG accessibility compliance (Level A).",
  },
  "Canonical URL": {
    why: "Canonical tags tell search engines which version of a page is the 'official' one. Without it, duplicate content across URL variants (www vs non-www, http vs https, query parameters) can split your ranking signals.",
    howToFix: [
      "Add a <link rel='canonical'> tag pointing to the preferred URL",
      "Use absolute URLs, not relative paths",
      "Ensure the canonical URL is consistent and self-referencing",
      "Check that redirects and canonicals align",
    ],
    learnMore: "Canonical tags are hints, not directives — Google may ignore them if they seem incorrect.",
  },
  "Open Graph Tags": {
    why: "Open Graph meta tags control how your page appears when shared on Facebook, LinkedIn, Twitter, and other social platforms. Rich previews with images and descriptions get significantly more engagement.",
    howToFix: [
      "Add og:title, og:description, and og:image at minimum",
      "Use an image at least 1200×630px for best display",
      "Add og:url and og:type for completeness",
      "Test with Facebook's Sharing Debugger tool",
    ],
    learnMore: "Twitter uses its own twitter:card tags but falls back to Open Graph.",
  },
  "JSON-LD Schema": {
    why: "Structured data (JSON-LD) helps search engines understand your content semantically. It can enable rich results like star ratings, FAQs, breadcrumbs, and knowledge panels — dramatically improving visibility.",
    howToFix: [
      "Add Organization or LocalBusiness schema for your business",
      "Include WebPage or Article schema for content pages",
      "Add FAQ schema if you have Q&A content",
      "Validate with Google's Rich Results Test tool",
    ],
    learnMore: "JSON-LD is Google's preferred structured data format over Microdata or RDFa.",
  },
  "Mobile Viewport": {
    why: "The viewport meta tag tells mobile browsers how to scale the page. Without it, your site will render at desktop width on mobile, requiring zoom. Google uses mobile-first indexing, so this directly affects rankings.",
    howToFix: [
      "Add <meta name='viewport' content='width=device-width, initial-scale=1'>",
      "Ensure your CSS is responsive at common breakpoints",
      "Test with Chrome DevTools mobile emulator",
      "Avoid fixed-width layouts",
    ],
    learnMore: "Mobile-first indexing means Google primarily uses the mobile version of your site for ranking.",
  },
  "robots.txt": {
    why: "robots.txt controls which pages search engine crawlers can access. A misconfigured robots.txt can accidentally block important pages from being indexed, making them invisible in search results.",
    howToFix: [
      "Ensure important pages and resources are not blocked",
      "Don't block CSS/JS files — Google needs them to render pages",
      "Add a Sitemap directive pointing to your XML sitemap",
      "Review rules periodically as your site structure changes",
    ],
    learnMore: "robots.txt is a suggestion, not enforcement — malicious bots may ignore it.",
  },
  "SSL Certificate": {
    why: "HTTPS is a confirmed Google ranking signal. Beyond SEO, it encrypts data between your server and visitors, builds user trust (padlock icon), and is required for modern features like service workers and HTTP/2.",
    howToFix: [
      "Install an SSL certificate (free via Let's Encrypt)",
      "Redirect all HTTP traffic to HTTPS with 301 redirects",
      "Update internal links and canonical URLs to use https://",
      "Check for mixed content warnings (HTTP resources on HTTPS pages)",
    ],
    learnMore: "Chrome flags non-HTTPS sites as 'Not Secure' in the address bar.",
  },
  "Hreflang Tags": {
    why: "Hreflang tags tell search engines which language and regional version of a page to show users. Without them, Google may show the wrong language version or flag content as duplicate across locales.",
    howToFix: [
      "Add hreflang tags for each language/region variant",
      "Include a self-referencing hreflang on each page",
      "Use x-default for a fallback page",
      "Ensure bidirectional linking between all variants",
    ],
    learnMore: "Only needed for multi-language/region sites. Single-language sites can skip this.",
  },
  "Internal Linking": {
    why: "Internal links help search engines discover and understand the structure of your site. They distribute link equity (ranking power) across pages and help users navigate to related content, reducing bounce rates.",
    howToFix: [
      "Link to important pages from your homepage and navigation",
      "Use descriptive anchor text — avoid 'click here'",
      "Add contextual links within body content to related pages",
      "Aim for every important page to be reachable within 3 clicks",
    ],
    learnMore: "Orphan pages (no internal links pointing to them) are hard for search engines to find.",
  },
  "Heading Hierarchy": {
    why: "A proper heading hierarchy (H1 > H2 > H3) creates a semantic outline of your page. Search engines and AI systems use this structure to understand content relationships. Skipping levels (e.g., H1 to H3) breaks the logical flow.",
    howToFix: [
      "Start with a single H1, then use H2 for main sections",
      "Nest H3 under H2, H4 under H3 — never skip levels",
      "Use headings to reflect the content outline, not for styling",
      "Audit with a heading-level browser extension to visualize the tree",
    ],
    learnMore: "Screen readers use heading hierarchy for navigation — skipped levels confuse assistive technology users.",
  },
  "Schema Completeness": {
    why: "Having structured data is good, but incomplete schema limits your rich result eligibility. Missing properties like org:logo, article:author, or article:dateModified mean search engines can't generate star ratings, author cards, or freshness indicators.",
    howToFix: [
      "Add name, logo, url, and contactPoint to your Organization schema",
      "Include author, datePublished, dateModified, and image in Article schema",
      "Add sameAs links to official social profiles and Wikipedia",
      "Validate completeness with Google's Rich Results Test",
    ],
    learnMore: "Google requires specific properties per schema type — incomplete schemas are silently ignored for rich results.",
  },
  "Meta Robots": {
    why: "The meta robots directive controls how search engines index and display your page. A noindex tag makes the page invisible in search results. nosnippet blocks featured snippets and AI Overviews — both critical for modern visibility.",
    howToFix: [
      "Remove noindex unless you intentionally want the page hidden from search",
      "Avoid nosnippet — it prevents AI Overviews and featured snippets",
      "Use max-snippet, max-image-preview for fine-grained control instead",
      "Check for conflicting directives between meta tags and HTTP headers",
    ],
    learnMore: "noindex pages can still be crawled — use robots.txt Disallow to prevent crawling entirely.",
  },
  "Content Depth": {
    why: "Thin content (under 300 words) rarely ranks for competitive queries. Search engines and AI systems associate longer, comprehensive content with topical authority. Pages under 500 words are 3x less likely to appear in AI-generated answers.",
    howToFix: [
      "Aim for 800+ words on key landing pages and blog posts",
      "Cover the topic comprehensively — answer related questions",
      "Add sections for use cases, comparisons, or FAQs to increase depth",
      "Don't pad with filler — every paragraph should add value",
    ],
    learnMore: "The average first-page Google result contains 1,447 words — depth correlates with rankings.",
  },
  "Content-to-Code Ratio": {
    why: "A low text-to-HTML ratio means your page is bloated with code relative to visible content. Search engines must parse through excessive markup to find actual content, and pages heavy on JavaScript/CSS with little text signal low content value.",
    howToFix: [
      "Move inline styles and scripts to external files",
      "Remove unnecessary HTML comments and whitespace",
      "Minify CSS and JavaScript in production builds",
      "Aim for 25%+ text ratio — ensure the page is content-first",
    ],
    learnMore: "A ratio below 10% is a strong signal of a code-heavy page that search engines may deprioritize.",
  },

  "Redirect Chain": {
    why: "Redirect chains (multiple hops from URL A -> B -> C) slow down page loading, waste crawl budget, and dilute link equity with each hop. Search engines may stop following after 3-5 redirects, making the final page unreachable.",
    howToFix: [
      "Update redirects to point directly to the final destination (skip intermediate hops)",
      "Audit your redirect rules for chains — tools like Screaming Frog can map these",
      "Update internal links to point to the final URL, not the redirect source",
      "Keep redirects to a maximum of 1 hop",
    ],
    learnMore: "Each redirect hop adds 50-100ms of latency and loses approximately 15% of link equity.",
  },
  "Modern Image Formats": {
    why: "WebP and AVIF images are 25-50% smaller than JPEG/PNG at the same quality. Using modern formats dramatically improves page load speed, reduces bandwidth costs, and improves Core Web Vitals (especially LCP).",
    howToFix: [
      "Convert images to WebP (95% browser support) or AVIF (85% support)",
      "Use <picture> elements with format fallbacks for older browsers",
      "Configure your CDN to auto-convert images (Cloudinary, imgix, Fastly IO)",
      "Use build tools like sharp or imagemin to automate conversion",
    ],
    learnMore: "WebP is supported by all modern browsers. AVIF offers even better compression but has slightly less support.",
  },
  "Responsive Images": {
    why: "Without srcset and sizes attributes, browsers download the full-size image regardless of screen size. Mobile users on 3G load desktop-sized images, wasting bandwidth and hurting LCP. Responsive images serve the right size for each device.",
    howToFix: [
      "Add srcset attribute with multiple image sizes (400w, 800w, 1200w)",
      "Add sizes attribute to tell the browser which size to pick based on viewport",
      "Use <picture> with multiple <source> elements for art direction",
      "Small icons and logos (under 100px) don't need srcset",
    ],
    learnMore: "Responsive images can reduce mobile page weight by 50-70% compared to serving desktop images to all devices.",
  },
  "Schema Currency": {
    why: "Google periodically deprecates structured data types. Using deprecated schema (like HowTo for mobile, SpecialAnnouncement) wastes development effort and may confuse search engines. Keeping schema current ensures your rich results remain eligible.",
    howToFix: [
      "Remove SpecialAnnouncement schema (fully deprecated July 2025)",
      "Review HowTo schema — removed from mobile search (Sep 2023) but still valid for desktop",
      "Check FAQPage usage — restricted to government and health sites since Aug 2023",
      "Monitor Google Search Central for schema deprecation announcements",
    ],
    learnMore: "Google's Rich Results Test shows which schema types are currently eligible for rich results.",
  },
  "Mixed Content": {
    why: "Loading HTTP resources (images, scripts, stylesheets) on an HTTPS page creates mixed content warnings. Browsers may block these resources, breaking functionality. It also undermines the security that HTTPS provides.",
    howToFix: [
      "Update all resource URLs to use https:// instead of http://",
      "Use protocol-relative URLs (//) only if you also serve HTTP pages",
      "Check third-party embeds and scripts for HTTP references",
      "Add Content-Security-Policy: upgrade-insecure-requests header as a safety net",
    ],
    learnMore: "Chrome blocks mixed active content (scripts, iframes) by default and warns about mixed passive content (images).",
  },
  "Favicon & Icons": {
    why: "Favicons appear in browser tabs, bookmarks, search results, and mobile home screens. Missing favicons look unprofessional and make your site harder to identify. Apple touch icons provide the icon used when users add your site to their home screen.",
    howToFix: [
      "Add a <link rel='icon'> tag pointing to your favicon",
      "Add a <link rel='apple-touch-icon'> for iOS home screen icons (180x180px)",
      "Provide multiple sizes for different contexts (16x16, 32x32, 192x192)",
      "Use SVG favicons for crisp display at any size (supported by modern browsers)",
    ],
    learnMore: "Google shows favicons next to search results on mobile — a missing favicon is a missed branding opportunity.",
  },

  "AI Content Quality": {
    why: "Google's helpful content system penalizes pages that appear machine-generated. AI-written text has measurable vocabulary patterns — words like 'delve', 'tapestry', and 'pivotal' have spiked 50%+ since ChatGPT's release. Pages flagged as AI-generated rank significantly lower.",
    howToFix: [
      "Replace AI-typical words with simpler alternatives: 'delve' -> 'explore', 'leverage' -> 'use'",
      "Remove filler phrases like 'in today's fast-paced world' and 'it's important to note'",
      "Add original insights, first-hand experience, and specific data that AI can't generate",
      "Have a human editor review and rewrite generic-sounding passages",
    ],
    learnMore: "Google doesn't ban AI content — it bans unhelpful content. The fix isn't 'don't use AI' but 'don't publish unedited AI output'.",
  },

  // ── AI Search ──
  "AI Crawler Access": {
    why: "AI platforms like ChatGPT (GPTBot), Claude (ClaudeBot), and Perplexity (PerplexityBot) use web crawlers to index content. If your robots.txt blocks these bots, your content will never appear in AI-generated answers — an increasingly dominant traffic source.",
    howToFix: [
      "Check robots.txt for Disallow rules targeting GPTBot, ClaudeBot, PerplexityBot",
      "Remove or relax AI bot blocks unless you have a specific reason to block them",
      "Consider allowing AI crawlers on public content while blocking private sections",
      "Monitor your server logs to see which AI bots are actually visiting",
    ],
    learnMore: "Blocking AI crawlers today is like blocking Googlebot in 2005 — you're opting out of the next major traffic channel.",
  },
  "AI Bot Access (Detailed)": {
    why: "Six major AI search bots (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot) crawl the web to index content for AI-generated answers. Each blocked bot is a traffic channel you're invisible in.",
    howToFix: [
      "Review robots.txt for Disallow rules targeting each AI bot individually",
      "Prioritize allowing search-relevant bots (GPTBot, ClaudeBot, PerplexityBot) over training-only bots",
      "Use a separate robots.txt section per bot for granular control",
      "Monitor server logs to track which AI bots visit and how often",
    ],
    learnMore: "Each AI platform has its own crawler — blocking one doesn't affect others. Be selective about which to allow.",
  },
  "Answer Capsules": {
    why: "Answer capsules are concise, quotable paragraphs (1-3 sentences) that directly follow an H2 heading. AI systems extract these as direct answers to questions. Without them, AI must synthesize answers from scattered content, making your site less likely to be cited.",
    howToFix: [
      "After each H2, write a 1-2 sentence definition or summary paragraph",
      "Start with 'X is...' or 'X refers to...' patterns that AI can directly quote",
      "Keep answer capsules under 50 words for maximum extractability",
      "Follow the capsule with supporting detail in subsequent paragraphs",
    ],
    learnMore: "Google's featured snippets use the same extraction pattern — answer capsules serve double duty for SEO and AI.",
  },
  "Content Extractability": {
    why: "AI systems prefer structured content — bullet lists, numbered lists, comparison tables, and definition lists. These formats are 2.5x more likely to be cited than plain prose because they're easy to parse and present as direct answers.",
    howToFix: [
      "Convert key information into bullet points or numbered steps",
      "Add comparison tables for features, pricing, or specifications",
      "Use definition lists for glossary-style content",
      "Structure how-to content as ordered lists with clear steps",
    ],
    learnMore: "Tables and lists also improve human readability and reduce bounce rates — a win for both SEO and UX.",
  },
  "Author & Expertise": {
    why: "E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is critical for both Google and AI systems. Content with identifiable authors and credentials is prioritized over anonymous content, especially for YMYL (Your Money, Your Life) topics.",
    howToFix: [
      "Add Person schema with name, jobTitle, and credentials for article authors",
      "Include an author bio section with qualifications and experience",
      "Link to author profiles on LinkedIn, Twitter, or your team page via sameAs",
      "Add author bylines with photos to build trust and E-E-A-T signals",
    ],
    learnMore: "AI systems weight author expertise heavily when deciding which sources to cite for medical, financial, and legal queries.",
  },
  "Source Attribution": {
    why: "Content that cites external sources, includes blockquotes, and references data is seen as more credible by both AI systems and users. AI deprioritizes unsourced claims — content with inline citations is 30-40% more visible in AI-generated answers.",
    howToFix: [
      "Add external links to authoritative sources every 150-200 words",
      "Use blockquote elements for expert quotes with attribution",
      "Include cite elements or reference sections for data sources",
      "Link to studies, research papers, or official documentation to support claims",
    ],
    learnMore: "Wikipedia-style inline citations are the gold standard — AI systems are trained on this pattern.",
  },
  "Content Clarity": {
    why: "AI systems like ChatGPT, Perplexity, and Claude need to quickly identify what your page is about. A clear, specific H1 and opening paragraphs make your content more likely to be surfaced in AI-generated answers.",
    howToFix: [
      "Write an H1 that specifically describes your product/service",
      "Lead with your value proposition in the first paragraph",
      "Avoid vague or marketing-speak openers like 'Welcome to our site'",
      "Structure content with clear heading hierarchy (H2, H3)",
    ],
    learnMore: "AI systems parse content top-down — the first 200 words carry disproportionate weight.",
  },
  "Citation Worthiness": {
    why: "AI assistants prefer to cite content with specific, verifiable claims — numbers, statistics, dates, and quoted sources. Vague marketing copy rarely gets cited. The more concrete your content, the more likely AI will reference it.",
    howToFix: [
      "Include specific numbers and statistics (e.g., '40% faster', '10,000+ customers')",
      "Add data sources and attribution for claims",
      "Include expert quotes or research references",
      "Update statistics regularly to maintain freshness",
    ],
    learnMore: "AI systems rank citation-worthy sources higher for factual queries.",
  },
  "Entity Recognition": {
    why: "For AI to mention your business by name, it needs to clearly identify you as a distinct entity. Organization schema, consistent naming, and a clear brand presence help AI systems build a knowledge graph entry for your business.",
    howToFix: [
      "Add Organization or LocalBusiness JSON-LD schema",
      "Include og:site_name in your Open Graph tags",
      "Use your brand name consistently in title, H1, and structured data",
      "Ensure your business name appears in the page content naturally",
    ],
    learnMore: "Google's Knowledge Graph and AI systems both rely on consistent entity signals.",
  },
  "FAQ Presence": {
    why: "FAQ content is one of the most citable formats for AI assistants. When users ask questions, AI looks for pre-formatted Q&A content to provide direct answers. FAQPage schema makes this extraction trivial.",
    howToFix: [
      "Add a dedicated FAQ section with common questions",
      "Mark it up with FAQPage JSON-LD schema",
      "Write questions the way real users would ask them",
      "Provide concise, specific answers (2-3 sentences each)",
    ],
    learnMore: "FAQ schema can also generate rich results in traditional Google search.",
  },
  "Answer Density": {
    why: "AI systems extract information paragraph by paragraph. Paragraphs that are concise (15-80 words) and contain specific data are ideal. Overly long or vague paragraphs get skipped in favor of more information-dense content.",
    howToFix: [
      "Break long paragraphs into focused, single-topic chunks",
      "Include at least one specific fact per paragraph",
      "Avoid filler words and qualifiers that dilute information",
      "Use numbers, dates, and specifics instead of vague claims",
    ],
    learnMore: "Think of each paragraph as a potential standalone answer to a question.",
  },
  "Freshness Signals": {
    why: "AI systems prefer citing up-to-date content. Without clear date signals, your content may be treated as potentially outdated. Schema.org dateModified is the strongest freshness signal AI systems can parse.",
    howToFix: [
      "Add dateModified to your JSON-LD schema",
      "Include visible publish/update dates on the page",
      "Use <time> elements with datetime attributes",
      "Actually update content regularly — don't just change the date",
    ],
    learnMore: "Content with a dateModified within the last 6 months is preferred for time-sensitive queries.",
  },
  "Content Freshness": {
    why: "AI systems prefer citing up-to-date content. Without clear date signals, your content may be treated as potentially outdated. Content updated within 30 days gets cited 3.2x more by ChatGPT.",
    howToFix: [
      "Add dateModified to your JSON-LD schema — the strongest freshness signal",
      "Include a visible 'Last updated' or 'Published' date on the page",
      "Use <time> elements with datetime attributes for machine-readable dates",
      "Actually update content regularly — don't just change the date",
    ],
    learnMore: "Schema dateModified combined with a visible date gives the strongest freshness signal to both Google and AI systems.",
  },
  "llms.txt File": {
    why: "llms.txt is an emerging standard (like robots.txt for AI) that tells AI crawlers how to interact with your site. While still new, early adoption signals AI-friendliness and lets you control how AI systems use your content.",
    howToFix: [
      "Create a /llms.txt file at your domain root",
      "Include a brief description of your site and its content",
      "Specify preferred citation format and licensing terms",
      "List key pages or sections AI should prioritize",
    ],
    learnMore: "llms.txt is still an emerging standard — adoption is growing but not yet universal. Early adoption shows AI-forward thinking.",
  },
  "Content Accessibility": {
    why: "AI crawlers cannot access content behind login walls, paywalls, or subscription gates. If your primary content is gated, it will never appear in AI-generated answers, regardless of quality.",
    howToFix: [
      "Ensure your main content is publicly accessible without login",
      "If using a paywall, provide a meaningful preview or summary visible to crawlers",
      "Remove unnecessary login requirements on informational pages",
      "Check for paywall CSS classes that might signal gated content to crawlers",
    ],
    learnMore: "A freemium model with ungated introductory content works best — AI can cite the free portion and drive users to the premium content.",
  },
  "Question Headings": {
    why: "AI systems match user queries to page headings. When your H2/H3 headings are phrased as questions ('What is...', 'How to...'), they directly match the natural language questions users ask AI assistants, making your content much more likely to be cited.",
    howToFix: [
      "Rephrase section headings as questions your audience actually asks",
      "Use natural question formats: What, How, Why, When, Where",
      "Keep question headings specific — 'How does SEO work?' not just 'SEO'",
      "Follow each question heading with a concise direct answer in the first paragraph",
    ],
    learnMore: "Google's People Also Ask and AI assistants both prefer question-answer formatted content.",
  },
  "Source Citations": {
    why: "Content that cites specific sources with attribution ('according to X', 'study by Y') is 37-40% more likely to be cited by AI systems. AI assistants prioritize verifiable, sourced information over unsupported claims.",
    howToFix: [
      "Add attribution phrases near statistics: 'According to [Source], [data point]'",
      "Reference specific studies, reports, or organizations by name",
      "Include year references near data points for recency signals",
      "Aim for at least 3 sourced statistics per article",
    ],
    learnMore: "The Princeton GEO study found that citing sources is the #1 optimization for AI visibility, boosting citations by 37-40%.",
  },
  "Definition Clarity": {
    why: "AI systems extract 'X is...' definition patterns from the first paragraph after headings. Concise definitions (under 30 words) serve as perfect standalone answers. Without them, AI must synthesize definitions from scattered context.",
    howToFix: [
      "Start each section with a one-sentence definition: '[Topic] is [concise explanation]'",
      "Keep definitions under 30 words for maximum extractability",
      "Use 'refers to', 'means', or 'is defined as' patterns",
      "Follow the definition with supporting detail in subsequent paragraphs",
    ],
    learnMore: "Wikipedia's definition-first pattern is the gold standard — AI systems are trained on this format.",
  },

  // ── Marketing ──
  "Value Proposition": {
    why: "Your value proposition should be clear within 5 seconds of landing on the page. Visitors who don't immediately understand what you offer and why it matters will bounce. Generic phrases like 'best in class' add no value.",
    howToFix: [
      "Lead with a specific benefit, not a feature description",
      "Quantify your value ('Save 10 hours/week' not 'Save time')",
      "Differentiate from competitors — what's unique about you?",
      "Place your value proposition prominently in the H1 or hero section",
    ],
    learnMore: "The best value propositions answer: 'Why should I choose you over the alternatives?'",
  },
  "CTA Effectiveness": {
    why: "Calls-to-action convert visitors into leads and customers. Without clear CTAs, users don't know what step to take next. Well-designed CTAs with action verbs and clear value dramatically increase conversion rates.",
    howToFix: [
      "Use strong action verbs in your site's language: EN: Get, Start, Try, Book / NL: Ontdek, Bestel, Probeer, Vraag aan / FR: Découvrir, Essayer, Réserver / DE: Jetzt starten, Testen, Buchen",
      "Make the benefit clear: 'Start Free Trial' / 'Gratis uitproberen' / 'Essai gratuit' not just 'Submit'",
      "Place at least one CTA above the fold",
      "Use contrasting colors to make CTAs visually prominent",
    ],
    learnMore: "The average landing page has a 2-5% conversion rate — strong CTAs push toward the higher end.",
  },
  "Trust Signals": {
    why: "Trust signals reduce purchase anxiety and validate your claims. Testimonials, reviews, certifications, and client logos provide social proof that others have benefited from your offering.",
    howToFix: [
      "Add customer testimonials with names and photos",
      "Display review scores from third-party platforms",
      "Show certification badges and security seals",
      "Include specific results or case studies",
    ],
    learnMore: "92% of consumers read reviews before making a purchase decision.",
  },
  "Content Structure Consistency": {
    why: "Dramatically varying paragraph lengths create a disjointed reading experience. Consistent content structure — keeping paragraphs within a similar length range — improves readability and keeps visitors engaged.",
    howToFix: [
      "Aim for 2-4 sentences per paragraph across all sections",
      "Keep paragraph lengths relatively even across sections",
      "Use the same tense and perspective throughout",
      "Have a single editor review the full page for consistency",
    ],
    learnMore: "Tone consistency is especially important for longer landing pages and sales copy.",
  },
  "Social Proof": {
    why: "Social proof leverages the psychological principle that people follow the actions of others. Client logos, case studies, user counts, and media mentions signal credibility and reduce perceived risk for new visitors.",
    howToFix: [
      "Add a 'Trusted by' section with recognizable client logos",
      "Feature detailed case studies with measurable outcomes",
      "Display user/customer counts if impressive",
      "Include 'As seen in' media mentions if applicable",
    ],
    learnMore: "Social proof is most effective when it features companies or people your target audience admires.",
  },
  "Reviews & Ratings": {
    why: "Star ratings in search results increase click-through rates by 20-30%. AggregateRating schema enables rich snippet stars, and products with 5+ reviews are 270% more likely to convert. Without review markup, you miss one of the most powerful SERP enhancements.",
    howToFix: [
      "Add AggregateRating schema to product and service pages",
      "Embed reviews from Google, Trustpilot, or G2 with proper markup",
      "Display star ratings visually on the page alongside the schema",
      "Encourage customers to leave reviews with post-purchase email flows",
    ],
    learnMore: "Google may show review stars for products, recipes, courses, and local businesses — but not for self-serving reviews on your own site.",
  },
  "Video Content": {
    why: "Video increases time on page by 88% and lifts conversion rates by up to 86%. Pages with video are 53x more likely to rank on Google's first page. VideoObject schema enables video rich results and is increasingly preferred by AI Overviews.",
    howToFix: [
      "Add a product demo, explainer, or testimonial video to key landing pages",
      "Include VideoObject schema with name, description, thumbnailUrl, and uploadDate",
      "Host on YouTube for discoverability, then embed on your page",
      "Add captions and transcripts for accessibility and additional keyword coverage",
    ],
    learnMore: "AI Overviews increasingly surface video content — VideoObject schema is required for video rich results.",
  },
  "Contact Visibility": {
    why: "Visible contact information is a critical trust signal. Pages with multiple contact methods (phone, email, form) convert 40% better than those without. For local businesses, ContactPoint schema enables click-to-call in search results.",
    howToFix: [
      "Add a visible phone number and email address, ideally in the header or footer",
      "Include a contact form on key landing pages",
      "Add ContactPoint schema with telephone and contactType properties",
      "Display a physical address if applicable — essential for local SEO",
    ],
    learnMore: "47% of users will visit a competitor if they can't quickly find contact information.",
  },
  "Privacy & Security": {
    why: "Privacy policies and terms of service are legal requirements in most jurisdictions (GDPR, CCPA) and strong trust signals. Cookie consent banners show compliance awareness. Missing these elements signals to visitors that the site may not be trustworthy.",
    howToFix: [
      "Add a privacy policy page linked from every page footer",
      "Include terms of service for any transactional or data-collecting pages",
      "Implement a cookie consent banner that complies with GDPR/CCPA",
      "Display security badges (SSL, payment processor logos) near forms and checkout",
    ],
    learnMore: "GDPR fines can reach 4% of global revenue — compliance isn't optional for sites with EU visitors.",
  },

  "CTA Above Fold": {
    why: "If visitors have to scroll to find your call-to-action, many will leave before seeing it. Placing a CTA in the header or hero section ensures every visitor sees the next step immediately, increasing conversion rates by up to 20%.",
    howToFix: [
      "Add a primary CTA button in your header or navigation bar",
      "Include a prominent CTA in your hero/banner section",
      "Use contrasting colors to make the CTA visually stand out",
      "Keep the CTA text action-oriented: 'Get Started', 'Try Free', 'Book Demo'",
    ],
    learnMore: "The fold line varies by device — test on mobile (600px) and desktop (900px) to ensure visibility.",
  },
  "CTA Copy Quality": {
    why: "Generic CTA text like 'Submit', 'Click Here', or 'Learn More' tells visitors nothing about what they'll get. Value-communicating CTAs ('Start Free Trial', 'Download Guide') set clear expectations and convert 2-3x better.",
    howToFix: [
      "Replace 'Submit' with action + benefit: 'Get My Free Report'",
      "Replace 'Click Here' with specific actions: 'See Pricing', 'Book a Demo'",
      "Replace 'Learn More' with 'Read the Case Study' or 'See How It Works'",
      "A/B test CTA copy — small wording changes often yield 10-20% conversion lifts",
    ],
    learnMore: "The best CTAs communicate value, not just action. 'Start Saving Today' outperforms 'Sign Up' consistently.",
  },
  "Form Optimization": {
    why: "Every additional form field reduces completion rates by 10-25%. Forms with 7+ fields see 25-50% abandonment. Shorter forms capture more leads, even if the data is less detailed — you can always ask for more later.",
    howToFix: [
      "Reduce to 3-4 essential fields (name, email, one qualifying question)",
      "Remove optional fields — if you don't need it now, don't ask for it",
      "Use progressive profiling to collect additional data over time",
      "Clearly label required vs optional fields if you must include extras",
    ],
    learnMore: "Hubspot found that reducing form fields from 4 to 3 increased conversions by 50%.",
  },
  "Trust Near CTAs": {
    why: "Placing trust signals (testimonials, ratings, security badges) near your call-to-action reduces purchase anxiety at the moment of decision. Trust elements far from the CTA don't reinforce confidence when it matters most.",
    howToFix: [
      "Add a testimonial quote or star rating directly below or beside your main CTA",
      "Display security badges ('SSL Secure', 'Money-Back Guarantee') near checkout buttons",
      "Show client logos or 'Trusted by X companies' near signup forms",
      "Place a brief social proof snippet ('Join 10,000+ users') inline with the CTA",
    ],
    learnMore: "Trust signals within the same viewport as the CTA increase conversion rates by 15-25%.",
  },
  "Logo Detection": {
    why: "A visible logo in the header establishes brand identity instantly. Without a logo, visitors may question the site's legitimacy. Logos also help returning visitors recognize your brand and build long-term recall.",
    howToFix: [
      "Add your logo as an image or SVG in the site header",
      "Ensure the logo links back to the homepage",
      "Use descriptive alt text on the logo image for accessibility",
      "Keep the logo size appropriate — visible but not overwhelming (40-60px height)",
    ],
    learnMore: "Sites without visible logos have 20% higher bounce rates — visitors expect professional branding.",
  },
  "Typography Quality": {
    why: "Custom fonts create visual distinction and brand personality. Sites using only generic system fonts (Arial, Times New Roman) appear generic and undesigned, reducing perceived quality and trust.",
    howToFix: [
      "Load at least one custom font for headings (Google Fonts, Adobe Fonts, or self-hosted)",
      "Use a distinct body font if possible — pairing a display font with a readable body font creates hierarchy",
      "Use font-display: swap to prevent invisible text during font loading",
      "Limit total font families to 2-3 to avoid performance bloat",
    ],
    learnMore: "Typography accounts for 95% of web design — custom fonts are one of the highest-impact visual upgrades.",
  },
  "Color Contrast": {
    why: "Poor color contrast makes text unreadable for users with visual impairments and is a WCAG accessibility violation. Low contrast also strains the eyes of all users, increasing bounce rates especially on mobile.",
    howToFix: [
      "Ensure body text has at least 4.5:1 contrast ratio against its background",
      "Large text (18px+ bold or 24px+ regular) needs at least 3:1 contrast",
      "Use a contrast checker tool to validate color combinations",
      "Avoid light gray text on white backgrounds — a common accessibility issue",
    ],
    learnMore: "This check only evaluates inline styles. Use a dedicated tool like axe or WAVE for a full WCAG contrast audit.",
  },

  // ── WordPress ──
  "SEO Plugin Active": {
    why: "WordPress doesn't include advanced SEO features by default. An SEO plugin (Yoast, Rank Math, AIOSEO) adds XML sitemaps, meta tag controls, canonical URLs, schema markup, and social previews — all critical for search visibility.",
    howToFix: [
      "Install Yoast SEO, Rank Math, or All in One SEO from the WordPress plugin directory",
      "Configure the plugin's setup wizard with your site type and social profiles",
      "Set up XML sitemaps and submit them to Google Search Console",
      "Use the plugin's per-page SEO analysis to optimize titles, descriptions, and readability",
    ],
    learnMore: "Rank Math and Yoast both offer free tiers that cover 90% of what most sites need.",
  },
  "Content Freshness": {
    why: "Google's Freshness algorithm rewards recently published and updated content. For WordPress sites, stale content (no new posts in 90+ days) signals an inactive site. Consistent publishing maintains crawl frequency and topical authority.",
    howToFix: [
      "Publish new content at least weekly for optimal freshness signals",
      "Update existing high-performing posts with new data and current dates",
      "Set up an editorial calendar to maintain a consistent publishing schedule",
      "Use the WordPress 'Last Modified' date in your theme to signal content updates",
    ],
    learnMore: "Google crawls frequently-updated sites more often — posting regularly increases your crawl budget.",
  },
  "Publishing Frequency": {
    why: "Consistent publishing builds topical authority and signals to search engines that your site is actively maintained. Sites publishing weekly see 3.5x more traffic than those publishing monthly. Irregular posting hurts audience retention and newsletter engagement.",
    howToFix: [
      "Set a realistic publishing cadence you can sustain (weekly is ideal)",
      "Batch-create content and use WordPress's scheduled publishing feature",
      "Repurpose existing content into new formats (listicles, guides, updates)",
      "Track publishing cadence in your editorial calendar tool",
    ],
    learnMore: "Quality over quantity — one well-researched weekly post outperforms daily thin content.",
  },
  "Post Excerpts": {
    why: "Custom excerpts control how your posts appear in archives, RSS feeds, search results, and social shares. WordPress auto-generates excerpts by truncating the first 55 words, which often cuts mid-sentence and misses the key value proposition.",
    howToFix: [
      "Write a custom excerpt for every post (120-160 characters, like a meta description)",
      "Include your primary keyword and a compelling hook in the excerpt",
      "Use the excerpt field in the WordPress editor (enable via Screen Options if hidden)",
      "Check that your theme uses the_excerpt() instead of the_content() in archive templates",
    ],
    learnMore: "Custom excerpts also improve your RSS feed presentation — many subscribers decide to click based on the excerpt alone.",
  },
  "Featured Images": {
    why: "Featured images appear in social shares, Google Discover, archive pages, and related post widgets. Posts without featured images get significantly less engagement on social media and look incomplete in WordPress archive layouts.",
    howToFix: [
      "Add a featured image to every post before publishing",
      "Use images at least 1200x630px for optimal social sharing display",
      "Optimize file size with compression (aim for under 200KB)",
      "Write descriptive alt text for each featured image for accessibility and image SEO",
    ],
    learnMore: "Posts with images get 94% more views than those without — featured images are the first thing visitors see.",
  },
  "Taxonomy Health": {
    why: "WordPress categories and tags create taxonomy archive pages that Google indexes. Empty categories and tags generate thin, contentless pages that waste crawl budget and dilute your site's topical authority. Categories without descriptions miss an SEO opportunity.",
    howToFix: [
      "Delete or merge empty categories and tags with zero posts",
      "Write unique descriptions for each category (shown on archive pages and used by SEO plugins)",
      "Limit to 5-10 well-defined categories rather than dozens of overlapping ones",
      "Use tags sparingly — 3-5 per post maximum, and delete unused tags",
    ],
    learnMore: "Noindex empty taxonomy pages via your SEO plugin to prevent them from being crawled.",
  },
  "Author Enumeration": {
    why: "WordPress exposes user data (usernames, display names) through the REST API by default. Attackers use this for brute-force login attempts. Exposing usernames is a security risk that should be mitigated on production sites.",
    howToFix: [
      "Install a security plugin (Wordfence, Sucuri) that restricts REST API user endpoints",
      "Add a custom filter to disable the /wp/v2/users endpoint for unauthenticated requests",
      "Ensure display names are different from login usernames",
      "Enable two-factor authentication for all admin accounts",
    ],
    learnMore: "REST API user enumeration is one of the most common WordPress attack vectors — patching it is a quick security win.",
  },
  "REST API Exposure": {
    why: "WordPress exposes API namespaces for every active plugin. Each namespace is a potential attack surface. While the REST API is needed for the editor and some plugins, publicly exposing dozens of endpoints increases your security risk profile.",
    howToFix: [
      "Audit exposed namespaces — disable any not needed by your front-end",
      "Use a security plugin to restrict REST API access to authenticated users only",
      "Keep plugins updated to patch known API vulnerabilities",
      "Remove inactive plugins — they may still register API endpoints",
    ],
    learnMore: "The WordPress REST API can be restricted without breaking the block editor by whitelisting only needed namespaces.",
  },

  // ── Performance ──
  "LCP": {
    why: "Largest Contentful Paint measures when the biggest visible element (hero image, heading, or video) finishes loading. It's Google's primary metric for perceived load speed. LCP over 2.5 seconds directly hurts your Core Web Vitals ranking signal.",
    howToFix: [
      "Preload the LCP image with <link rel='preload'> in the document head",
      "Use modern image formats (WebP, AVIF) with appropriate sizing",
      "Reduce server response time (TTFB) — upgrade hosting or add a CDN",
      "Remove render-blocking CSS and JavaScript above the fold",
    ],
    learnMore: "The LCP element is different on mobile vs desktop — test both in Chrome DevTools.",
  },
  "INP": {
    why: "Interaction to Next Paint replaced FID as Google's responsiveness metric in March 2024. It measures the delay between any user interaction (click, tap, keypress) and the next visual update. Poor INP means your site feels sluggish to use.",
    howToFix: [
      "Break up long JavaScript tasks (over 50ms) into smaller chunks using requestIdleCallback",
      "Reduce third-party script impact — defer non-critical scripts",
      "Use web workers for heavy computations off the main thread",
      "Minimize DOM size — large DOMs slow down event handlers",
    ],
    learnMore: "INP measures ALL interactions throughout the page lifecycle, not just the first one like FID did.",
  },
  "FID": {
    why: "First Input Delay measured the time from a user's first interaction to when the browser could respond. While replaced by INP as a Core Web Vital, FID data from real users still indicates main-thread blocking issues that affect all interactions.",
    howToFix: [
      "Reduce JavaScript execution time during page load",
      "Break up long tasks with code splitting and lazy loading",
      "Minimize third-party script impact during initial load",
      "Use the browser's Performance tab to identify long tasks",
    ],
    learnMore: "FID was deprecated as a Core Web Vital in March 2024 — INP is now the official responsiveness metric.",
  },
  "TBT": {
    why: "Total Blocking Time is the lab-data proxy for responsiveness. It sums all time periods where the main thread was blocked for more than 50ms between FCP and TTI. High TBT means users experience jank, frozen inputs, and unresponsive buttons.",
    howToFix: [
      "Audit long tasks with Chrome DevTools Performance panel",
      "Code-split JavaScript bundles — load only what's needed per page",
      "Defer or lazy-load third-party scripts (analytics, chat widgets, ads)",
      "Tree-shake unused code from your production bundle",
    ],
    learnMore: "TBT under 200ms in lab conditions generally correlates with good INP scores in the field.",
  },
  "CLS": {
    why: "Cumulative Layout Shift measures unexpected visual movement — buttons jumping, text reflowing, images pushing content down. CLS above 0.1 directly hurts your Core Web Vitals score and frustrates users who mis-click shifted elements.",
    howToFix: [
      "Always set width and height attributes on images and videos",
      "Reserve space for ads, embeds, and dynamic content with CSS aspect-ratio",
      "Avoid inserting content above existing content after page load",
      "Use CSS font-display: swap with size-adjust to prevent font-swap layout shifts",
    ],
    learnMore: "CLS is measured for the entire page lifecycle — late-loading ads and lazy content can trigger shifts long after initial load.",
  },
  "FCP": {
    why: "First Contentful Paint measures when the first text or image appears on screen. It's the user's first visual feedback that the page is loading. Slow FCP (over 1.8s) makes users think the page is broken and increases bounce rates.",
    howToFix: [
      "Reduce server response time with caching and CDN",
      "Eliminate render-blocking resources — inline critical CSS, defer non-critical JS",
      "Preconnect to required origins with <link rel='preconnect'>",
      "Avoid large, synchronous JavaScript bundles in the document head",
    ],
    learnMore: "FCP and LCP often improve together — optimizing render-blocking resources helps both metrics.",
  },
  "SI": {
    why: "Speed Index measures how quickly the visible area of the page is populated with content. Unlike FCP/LCP which track single moments, Speed Index captures the overall visual loading experience. A slow Speed Index means content trickles in rather than appearing at once.",
    howToFix: [
      "Optimize the critical rendering path — inline above-the-fold CSS",
      "Compress and properly size all visible images",
      "Minimize main-thread work during initial page render",
      "Use server-side rendering or static generation for content-heavy pages",
    ],
    learnMore: "Speed Index is a Lighthouse-only lab metric — it's not available from real user (CrUX) field data.",
  },
  "TTI": {
    why: "Time to Interactive measures when the page becomes fully interactive — all event handlers are registered and the page responds to user input within 50ms. Long TTI means users see content but can't interact with it, leading to rage clicks and frustration.",
    howToFix: [
      "Minimize main-thread work by reducing JavaScript execution time",
      "Implement code splitting to load only essential JavaScript first",
      "Defer non-critical third-party scripts until after the page is interactive",
      "Pre-render or server-render interactive components to reduce client-side hydration time",
    ],
    learnMore: "TTI is a lab-only metric — in the field, INP and TBT are better indicators of real interactivity.",
  },

  // ── New Marketing Differentiation Checks ──
  "Benefit vs. Feature Language": {
    why: "Pages that lead with outcomes ('save 14 hours/week') convert 2-4x better than pages that lead with specifications ('built with React'). The ideal balance is 40-60% benefits backed by specific, quantified claims.",
    howToFix: [
      "Reframe features as benefits: 'API integration' becomes 'Connect your tools in minutes'",
      "Quantify every claim: 'Save time' becomes 'Save 14 hours per week'",
      "Lead paragraphs with outcomes, then explain the how",
      "Aim for a 50/50 balance of benefits and supporting features",
    ],
    learnMore: "Benefit-heavy copy without specifics reads as fluffy. Back every claim with numbers.",
  },
  "Urgency & Scarcity": {
    why: "Urgency and scarcity signals can increase conversion by up to 332%. However, they must match the page context — product pages benefit from urgency, while service pages often convert better with trust-based messaging.",
    howToFix: [
      "Use urgency only when genuine: real deadlines, limited inventory, seasonal offers",
      "Avoid fake countdown timers — they erode trust when users notice",
      "For service pages, focus on trust signals instead of pressure",
      "Keep urgency signals to 1-3 per page — more than that feels desperate",
    ],
    learnMore: "Overuse of urgency tactics reduces credibility and can increase bounce rates.",
  },
  "Emotional Trigger Words": {
    why: "Power words trigger psychological responses that increase click-through and conversion rates by 2-3x. The sweet spot is 4-8 trigger words across trust, exclusivity, curiosity, and empowerment categories.",
    howToFix: [
      "Add trust words near CTAs: 'guaranteed', 'proven', 'risk-free'",
      "Use curiosity words in headlines: 'secret', 'surprising', 'discover'",
      "Diversify across categories — don't repeat the same emotional trigger",
      "Avoid stuffing: more than 12 power words per page reduces credibility",
    ],
    learnMore: "Quality over quantity — a few well-placed power words outperform many scattered ones.",
  },
  "Headline Formula Quality": {
    why: "Headlines using proven formulas (numbered lists, how-to, questions, outcomes) get 73% more engagement. These patterns have been validated across millions of articles and landing pages.",
    howToFix: [
      "Use number-led headlines: '7 Ways to Boost Your SEO'",
      "Add how-to headings for instructional content",
      "Frame headings as questions your audience is asking",
      "Start headings with outcome verbs: 'Get', 'Build', 'Grow', 'Achieve'",
      "Mix formula types — variety keeps readers engaged",
    ],
    learnMore: "Clear, specific headlines that don't match a formula can still be effective.",
  },
  "Above-Fold Messaging": {
    why: "Visitors decide in under 5 seconds whether to stay. Your hero section must communicate WHO you are (brand), WHAT you do (offering), and FOR WHOM (target audience). Missing any of these causes 55% bounce rates.",
    howToFix: [
      "Ensure your logo is visible in the header",
      "State what you do clearly in the H1 — avoid vague taglines",
      "Name your target audience in the first paragraph: 'for teams', 'for agencies'",
      "Use Organization schema to reinforce brand identity for AI engines",
    ],
    learnMore: "The 5-second test: can a stranger tell who you are, what you do, and if it's for them?",
  },
  "Social Proof Signals": {
    why: "92% of consumers trust peer recommendations over advertising. Social proof — testimonials, customer counts, logos, case studies, and awards — is the strongest conversion factor on commercial pages.",
    howToFix: [
      "Add 2-3 customer testimonials with names and specific results",
      "Display your customer count: 'Trusted by 10,000+ companies'",
      "Show client logos or 'As seen in' media logos",
      "Link to case studies with measurable outcomes",
      "Display certifications, awards, or review platform badges (G2, Trustpilot)",
    ],
    learnMore: "Layer multiple types of social proof for maximum credibility.",
  },
};

export default explanations;
