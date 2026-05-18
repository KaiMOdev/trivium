const { runLlmChecks } = require("../checks/llm");

const defaultRobots = {
  accessible: true, disallowed: [], content: "",
  blockedAiBots: [], allowedAiBots: [],
  wildcardBlocksAll: false, sitemapDirectives: [],
};

function makePageData(overrides = {}) {
  return {
    h1s: ["Professional Web Development Services"],
    paragraphs: [
      "We have helped over 150 clients achieve 40% more organic traffic with our proven methodology.",
      "Our team of 12 experts delivers custom solutions for businesses of all sizes.",
      "Founded in 2018, we have completed more than 500 projects across 30 industries.",
    ],
    jsonLd: [{ "@type": "Organization", name: "Test Corp" }],
    og: { site_name: "Test Corp" },
    title: "Test Corp - Web Development",
    hasFaqSchema: false,
    faqPatterns: 0,
    timeElements: [],
    dateModified: null,
    llmsTxt: { exists: false, content: null, status: 0 },
    paywallSignals: { hasPaywallClasses: false, hasLoginForm: false },
    ...overrides,
  };
}

describe("LLM Readiness Checks", () => {
  test("returns 19 checks (without readability — no visibleText in default data)", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    expect(results).toHaveLength(19);
  });

  test("all checks have required shape", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    results.forEach((r) => {
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("detail");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  // Content Clarity
  test("content clarity: high score for specific H1", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const clarity = results.find((r) => r.label === "Content Clarity");
    expect(clarity.score).toBeGreaterThanOrEqual(60);
  });

  test("content clarity: low score for generic H1", () => {
    const data = makePageData({ h1s: ["Welcome"] });
    const results = runLlmChecks(data, defaultRobots);
    const clarity = results.find((r) => r.label === "Content Clarity");
    expect(clarity.score).toBeLessThan(60);
  });

  test("content clarity: low score when no H1", () => {
    const data = makePageData({ h1s: [] });
    const results = runLlmChecks(data, defaultRobots);
    const clarity = results.find((r) => r.label === "Content Clarity");
    expect(clarity.score).toBeLessThan(50);
  });

  // Citation Worthiness
  test("citation: higher score with numbers and stats", () => {
    const data = makePageData({
      paragraphs: [
        "Revenue increased by 45% in Q3 2024.",
        "Customer satisfaction hit 98.5% across 1,200 respondents.",
        "We saved clients $2.5M in operational costs.",
      ],
    });
    const results = runLlmChecks(data, defaultRobots);
    const citation = results.find((r) => r.label === "Citation Worthiness");
    expect(citation.score).toBeGreaterThanOrEqual(40);
  });

  test("citation: low score without data points", () => {
    const data = makePageData({
      paragraphs: [
        "We provide great services to our valued clients.",
        "Our team is dedicated to quality and excellence.",
      ],
      jsonLd: [],
    });
    const results = runLlmChecks(data, defaultRobots);
    const citation = results.find((r) => r.label === "Citation Worthiness");
    expect(citation.score).toBeLessThan(30);
  });

  // Entity Recognition
  test("entity: high score with Organization schema", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const entity = results.find((r) => r.label === "Entity Recognition");
    expect(entity.score).toBeGreaterThanOrEqual(60);
  });

  test("entity: lower score without schema", () => {
    const data = makePageData({ jsonLd: [], og: {} });
    const results = runLlmChecks(data, defaultRobots);
    const entity = results.find((r) => r.label === "Entity Recognition");
    expect(entity.score).toBeLessThan(60);
  });

  // FAQ
  test("faq: high score with FAQ schema", () => {
    const data = makePageData({ hasFaqSchema: true });
    const results = runLlmChecks(data, defaultRobots);
    const faq = results.find((r) => r.label === "FAQ Presence");
    expect(faq.score).toBeGreaterThanOrEqual(90);
  });

  test("faq: neutral score without any FAQ content (not penalized for non-FAQ pages)", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const faq = results.find((r) => r.label === "FAQ Presence");
    expect(faq.score).toBeGreaterThanOrEqual(70);
  });

  // Content Freshness (replaces Freshness Signals)
  test("freshness: high score with recent dateModified in schema", () => {
    // Use a date within the last 90 days — stale dates are now penalized
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = makePageData({
      jsonLd: [{ "@type": "Organization", name: "Test Corp", dateModified: recent }],
    });
    const results = runLlmChecks(data, defaultRobots);
    const fresh = results.find((r) => r.label === "Content Freshness");
    expect(fresh.score).toBeGreaterThanOrEqual(80);
  });

  test("freshness: penalized when dateModified is stale (>90 days)", () => {
    const stale = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const data = makePageData({
      jsonLd: [{ "@type": "Organization", name: "Test Corp", dateModified: stale }],
    });
    const results = runLlmChecks(data, defaultRobots);
    const fresh = results.find((r) => r.label === "Content Freshness");
    expect(fresh.score).toBeLessThanOrEqual(50);
    expect(fresh.detail).toMatch(/\d+ days old/);
  });

  test("freshness: heavily penalized when dateModified is >1 year old", () => {
    const veryStale = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const data = makePageData({
      jsonLd: [{ "@type": "Organization", name: "Test Corp", dateModified: veryStale }],
    });
    const results = runLlmChecks(data, defaultRobots);
    const fresh = results.find((r) => r.label === "Content Freshness");
    expect(fresh.score).toBeLessThanOrEqual(30);
  });

  test("freshness: low score without any date signals", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const fresh = results.find((r) => r.label === "Content Freshness");
    expect(fresh.score).toBeLessThanOrEqual(35);
  });

  // Speakable Schema
  test("speakable: high score when present", () => {
    const data = makePageData({ hasSpeakableSchema: true });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Speakable Schema");
    expect(check.score).toBeGreaterThanOrEqual(90);
  });

  test("speakable: high pass score when absent on non-article page", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "Speakable Schema");
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  // WebSite / WebPage Schema
  test("website/webpage schema: high score when both present", () => {
    const data = makePageData({ hasWebSiteSchema: true, hasWebPageSchema: true, hasSearchAction: true });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "WebSite / WebPage Schema");
    expect(check.score).toBeGreaterThanOrEqual(90);
  });

  test("website/webpage schema: low score when both absent", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "WebSite / WebPage Schema");
    expect(check.score).toBeLessThanOrEqual(30);
  });

  // HowTo Schema
  test("howto: high score when schema present", () => {
    const data = makePageData({ hasHowToSchema: true });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "HowTo Schema");
    expect(check.score).toBeGreaterThanOrEqual(90);
  });

  test("howto: lower score when procedural content but no schema", () => {
    const data = makePageData({
      hasHowToSchema: false,
      paragraphs: ["Step 1: First, install the package. Step 2: Then configure it."],
    });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "HowTo Schema");
    expect(check.score).toBeLessThanOrEqual(40);
  });

  // AI Bot Access (Detailed)
  test("ai bot access: perfect score when no bots blocked", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "AI Bot Access (Detailed)");
    expect(check.score).toBe(100);
    expect(check.detail).toMatch(/All 13 search-relevant AI bots allowed/);
  });

  test("ai bot access: reduced score when some bots blocked", () => {
    const robots = { ...defaultRobots, blockedAiBots: ["GPTBot", "ClaudeBot"] };
    const results = runLlmChecks(makePageData(), robots);
    const check = results.find((r) => r.label === "AI Bot Access (Detailed)");
    expect(check.score).toBe(80);
    expect(check.detail).toMatch(/2\/13 search bots blocked/);
  });

  test("ai bot access: minimum score when all bots blocked", () => {
    const robots = { ...defaultRobots, blockedAiBots: ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Meta-ExternalAgent", "Meta-ExternalFetcher", "Amazonbot"] };
    const results = runLlmChecks(makePageData(), robots);
    const check = results.find((r) => r.label === "AI Bot Access (Detailed)");
    expect(check.score).toBe(10);
  });

  // llms.txt File
  test("llms.txt: perfect score when file follows llmstxt.org spec (H1 + blockquote)", () => {
    const data = makePageData({ llmsTxt: { exists: true, content: "# My Site\n\n> A short summary of what this site is about.\n\nMore content here.", status: 200 } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "llms.txt File");
    expect(check.score).toBe(100);
  });

  test("llms.txt: partial score when file exists but doesn't follow spec", () => {
    const data = makePageData({ llmsTxt: { exists: true, content: "Just some notes without proper formatting.", status: 200 } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "llms.txt File");
    expect(check.score).toBe(65);
    expect(check.detail).toMatch(/llmstxt\.org spec/);
  });

  test("llms.txt: medium score when file exists but empty", () => {
    const data = makePageData({ llmsTxt: { exists: true, content: "", status: 200 } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "llms.txt File");
    expect(check.score).toBe(60);
  });

  test("llms.txt: low score when file not found", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "llms.txt File");
    expect(check.score).toBe(50);
  });

  // Content Accessibility
  test("content accessibility: high score when freely accessible", () => {
    const results = runLlmChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "Content Accessibility");
    expect(check.score).toBe(100);
  });

  test("content accessibility: very low score with hard gate", () => {
    const data = makePageData({ paywallSignals: { hasPaywallClasses: true, hasLoginForm: true } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Content Accessibility");
    expect(check.score).toBe(25);
  });

  test("content accessibility: medium score with paywall only", () => {
    const data = makePageData({ paywallSignals: { hasPaywallClasses: true, hasLoginForm: false } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Content Accessibility");
    expect(check.score).toBe(60);
  });

  // Question Headings
  test("question headings: high score with 3+ question headings", () => {
    const data = makePageData({
      headings: {
        h2: ["What is SEO?", "How does it work?", "Why does it matter?"],
        h3: [],
      },
    });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Question Headings");
    expect(check.score).toBe(100);
  });

  test("question headings: low score with no question headings", () => {
    const data = makePageData({ headings: { h2: ["Our Services", "About Us"], h3: [] } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Question Headings");
    expect(check.score).toBe(35);
  });

  test("question headings: detects question mark ending", () => {
    const data = makePageData({ headings: { h2: ["Is this the right choice?"], h3: [] } });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Question Headings");
    expect(check.score).toBe(60);
  });

  // Source Citations
  test("source citations: high score with 3+ citation phrases", () => {
    const data = makePageData({
      visibleText: "According to research by Google, found that users prefer fast pages. Data from a study by Nielsen shows per industry standards this matters.",
    });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Source Citations");
    expect(check.score).toBeGreaterThanOrEqual(80);
  });

  test("source citations: low score with no citations", () => {
    const data = makePageData({ visibleText: "We build great websites for our clients." });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Source Citations");
    expect(check.score).toBe(35);
  });

  // Definition Clarity
  test("definition clarity: high score with multiple definitions", () => {
    const data = makePageData({
      paragraphs: [
        "SEO is the practice of optimizing web pages for search engines.",
        "A keyword is a term that users type into search engines.",
        "Backlinks are links from other websites that point to yours.",
        "Metadata refers to structured information about a page.",
      ],
    });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Definition Clarity");
    expect(check.score).toBeGreaterThanOrEqual(80);
  });

  test("definition clarity: low score with no definitions", () => {
    const data = makePageData({
      paragraphs: [
        "We build amazing products for our clients worldwide.",
        "Our team works hard every single day to deliver results.",
      ],
    });
    const results = runLlmChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Definition Clarity");
    expect(check.score).toBe(40);
  });
});
