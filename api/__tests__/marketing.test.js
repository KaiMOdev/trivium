const { runMarketingChecks } = require("../checks/marketing");

function makePageData(overrides = {}) {
  return {
    h1s: ["Grow Your Business With Data-Driven Marketing"],
    paragraphs: [
      "We have helped 200 clients increase conversion rates by 35% on average.",
      "Our proven methodology delivers measurable results within 90 days.",
      "Join thousands of satisfied customers who trust our platform.",
    ],
    ctas: ["Get Started", "Book a Demo"],
    hasTestimonials: true,
    hasSocialProof: true,
    ctaElements: [],
    trustElements: [],
    formFields: [],
    logoDetected: { found: false, location: "none", type: "none" },
    loadedFonts: [],
    inlineColorPairs: [],
    ...overrides,
  };
}

describe("Marketing Checks", () => {
  test("returns 26 checks", () => {
    const results = runMarketingChecks(makePageData());
    expect(results).toHaveLength(26);
  });

  test("all checks have required shape", () => {
    const results = runMarketingChecks(makePageData());
    results.forEach((r) => {
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("detail");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  // Value Proposition
  test("value prop: high score with specific claims", () => {
    const results = runMarketingChecks(makePageData());
    const vp = results.find((r) => r.label === "Value Proposition");
    expect(vp.score).toBeGreaterThanOrEqual(70);
  });

  test("value prop: low score with generic language", () => {
    const data = makePageData({
      h1s: ["Welcome to Our Company"],
      paragraphs: ["We are the best in class provider of solutions."],
    });
    const results = runMarketingChecks(data);
    const vp = results.find((r) => r.label === "Value Proposition");
    expect(vp.score).toBeLessThan(60);
  });

  // CTA
  test("cta: high score with action verb CTAs", () => {
    const results = runMarketingChecks(makePageData());
    const cta = results.find((r) => r.label === "CTA Effectiveness");
    expect(cta.score).toBeGreaterThanOrEqual(70);
  });

  test("cta: zero score with no CTAs", () => {
    const data = makePageData({ ctas: [] });
    const results = runMarketingChecks(data);
    const cta = results.find((r) => r.label === "CTA Effectiveness");
    expect(cta.score).toBeLessThanOrEqual(15);
  });

  // Trust Signals
  test("trust: high score with testimonials and reviews", () => {
    const data = makePageData({
      paragraphs: [
        "Read our customer testimonials and see our 5-star rating.",
        "We are certified and trusted by industry leaders.",
      ],
    });
    const results = runMarketingChecks(data);
    const trust = results.find((r) => r.label === "Trust Signals");
    expect(trust.score).toBeGreaterThanOrEqual(40);
  });

  test("trust: low score without any trust indicators", () => {
    const data = makePageData({
      paragraphs: ["We sell products online."],
      hasTestimonials: false,
      hasSocialProof: false,
    });
    const results = runMarketingChecks(data);
    const trust = results.find((r) => r.label === "Trust Signals");
    expect(trust.score).toBeLessThanOrEqual(20);
  });

  // Social Proof
  test("social proof: higher score with logos and testimonials", () => {
    const results = runMarketingChecks(makePageData());
    const sp = results.find((r) => r.label === "Social Proof");
    expect(sp.score).toBeGreaterThanOrEqual(50);
  });

  // Video Content
  test("video: informational score without video", () => {
    const data = makePageData({ hasVideo: false });
    const results = runMarketingChecks(data);
    const video = results.find((r) => r.label === "Video Content");
    expect(video.score).toBe(70);
    expect(video.detail).toContain("No video content");
  });

  test("video: high score with video and schema", () => {
    const data = makePageData({ hasVideo: true, videoSchemaCount: 1, videoElements: 1 });
    const results = runMarketingChecks(data);
    const video = results.find((r) => r.label === "Video Content");
    expect(video.score).toBeGreaterThanOrEqual(80);
  });

  // Image Lazy Loading
  test("lazy loading: high score when most images lazy-loaded", () => {
    const data = makePageData({ totalImagesForLazy: 10, lazyImages: 8 });
    const results = runMarketingChecks(data);
    const check = results.find((r) => r.label === "Image Lazy Loading");
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  test("lazy loading: low score when no images lazy-loaded", () => {
    const data = makePageData({ totalImagesForLazy: 10, lazyImages: 0 });
    const results = runMarketingChecks(data);
    const check = results.find((r) => r.label === "Image Lazy Loading");
    expect(check.score).toBeLessThanOrEqual(30);
  });

  // Font Display
  test("font display: high score with swap", () => {
    const data = makePageData({ hasFontDisplaySwap: true });
    const results = runMarketingChecks(data);
    const check = results.find((r) => r.label === "Font Display");
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  test("font display: low score without swap", () => {
    const results = runMarketingChecks(makePageData());
    const check = results.find((r) => r.label === "Font Display");
    expect(check.score).toBeLessThanOrEqual(40);
  });

  // Preconnect Hints
  test("preconnect: high score with multiple hints", () => {
    const data = makePageData({ preconnectCount: 3 });
    const results = runMarketingChecks(data);
    const check = results.find((r) => r.label === "Preconnect Hints");
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  test("preconnect: moderate score without hints", () => {
    const results = runMarketingChecks(makePageData());
    const check = results.find((r) => r.label === "Preconnect Hints");
    expect(check.score).toBe(45);
  });

  // Accessibility Landmarks
  test("accessibility: high score with semantic landmarks", () => {
    const data = makePageData({ semanticLandmarks: { nav: 1, main: 1, header: 1, footer: 1 }, ariaLandmarks: 2 });
    const results = runMarketingChecks(data);
    const check = results.find((r) => r.label === "Accessibility Landmarks");
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  test("accessibility: low score without landmarks", () => {
    const data = makePageData({ semanticLandmarks: {}, ariaLandmarks: 0 });
    const results = runMarketingChecks(data);
    const check = results.find((r) => r.label === "Accessibility Landmarks");
    expect(check.score).toBe(35);
  });

  describe("CTA Above Fold", () => {
    test("scores 100 with CTA in header", () => {
      const data = makePageData({ ctaElements: [{ text: "Get Started", inHeader: true }] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "CTA Above Fold");
      expect(check.score).toBe(100);
    });
    test("scores 20 with no CTA", () => {
      const data = makePageData({ ctaElements: [] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "CTA Above Fold");
      expect(check.score).toBe(20);
    });
  });

  describe("CTA Copy Quality", () => {
    test("scores 100 with no generic CTAs", () => {
      const data = makePageData({ ctaElements: [{ text: "Start Free Trial" }, { text: "Download Guide" }] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "CTA Copy Quality");
      expect(check.score).toBe(100);
    });
    test("flags generic CTA text", () => {
      const data = makePageData({ ctaElements: [{ text: "Submit" }, { text: "Click Here" }, { text: "Get Started" }] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "CTA Copy Quality");
      expect(check.score).toBeLessThanOrEqual(70);
    });
  });

  describe("Form Optimization", () => {
    test("scores 100 for 3 fields", () => {
      const data = makePageData({ formFields: [{ visibleCount: 3, isSearch: false, action: "/contact" }] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Form Optimization");
      expect(check.score).toBe(100);
    });
    test("scores 20 for 10+ fields", () => {
      const data = makePageData({ formFields: [{ visibleCount: 12, isSearch: false, action: "/apply" }] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Form Optimization");
      expect(check.score).toBe(20);
    });
    test("skips search forms", () => {
      const data = makePageData({ formFields: [{ visibleCount: 1, isSearch: true, action: "/search" }] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Form Optimization");
      expect(check.score).toBe(85);
    });
  });

  describe("Trust Near CTAs", () => {
    test("scores 85 when trust in same section as CTA", () => {
      const data = makePageData({
        ctaElements: [{ text: "Buy Now", sectionId: "hero" }],
        trustElements: [{ type: "testimonial", sectionId: "hero" }],
      });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Trust Near CTAs");
      expect(check.score).toBe(85);
    });
    test("scores 50 when trust in different section", () => {
      const data = makePageData({
        ctaElements: [{ text: "Buy Now", sectionId: "hero" }],
        trustElements: [{ type: "testimonial", sectionId: "footer" }],
      });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Trust Near CTAs");
      expect(check.score).toBe(50);
    });
    test("scores 40 when no trust elements", () => {
      const data = makePageData({ ctaElements: [{ text: "Buy Now" }], trustElements: [] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Trust Near CTAs");
      expect(check.score).toBe(40);
    });
  });

  describe("Logo Detection", () => {
    test("scores 100 for logo in header", () => {
      const data = makePageData({ logoDetected: { found: true, location: "header", type: "image" } });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Logo Detection");
      expect(check.score).toBe(100);
    });
    test("scores 25 when no logo", () => {
      const data = makePageData({ logoDetected: { found: false, location: "none", type: "none" } });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Logo Detection");
      expect(check.score).toBe(25);
    });
  });

  describe("Typography Quality", () => {
    test("scores 100 for 2+ custom fonts", () => {
      const data = makePageData({ loadedFonts: ["Outfit", "Fira Code"] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Typography Quality");
      expect(check.score).toBe(100);
    });
    test("scores 40 for only system fonts", () => {
      const data = makePageData({ loadedFonts: ["Arial", "Times New Roman"] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Typography Quality");
      expect(check.score).toBe(40);
    });
  });

  test("Privacy & Security: bonus when cookie banner has policy link", () => {
    const data = makePageData({
      hasPrivacyLink: true,
      hasTermsLink: true,
      hasCookieConsent: true,
      hasCookiePolicyLink: true,
      hasTrustBadges: false,
    });
    const results = runMarketingChecks(data);
    const check = results.find(r => r.label === "Privacy & Security");
    // 15 + 30(privacy) + 30(terms) + 15(cookie) + 10(link bonus) = 100
    expect(check.score).toBe(100);
  });

  test("Privacy & Security: penalty when cookie banner has no policy link", () => {
    const data = makePageData({
      hasPrivacyLink: true,
      hasTermsLink: true,
      hasCookieConsent: true,
      hasCookiePolicyLink: false,
      hasTrustBadges: false,
    });
    const results = runMarketingChecks(data);
    const check = results.find(r => r.label === "Privacy & Security");
    // 15 + 30(privacy) + 30(terms) + 15(cookie) - 15(no link) = 75
    expect(check.score).toBe(75);
  });

  describe("Color Contrast", () => {
    test("scores 100 (na) when no inline pairs", () => {
      const data = makePageData({ inlineColorPairs: [] });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Color Contrast");
      expect(check.score).toBe(100);
      expect(check.status).toBe("na");
      expect(check.detail).toContain("No inline color pairs");
    });
  });

  describe("Content Structure Consistency", () => {
    test("returns label Content Structure Consistency", () => {
      const data = makePageData({
        paragraphs: [
          "This is a medium length paragraph with about ten words in it.",
          "Another paragraph that is similar in length to the first one.",
          "A third paragraph keeping the same approximate word count here.",
        ],
      });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Content Structure Consistency");
      expect(check).toBeDefined();
      expect(check.score).toBeGreaterThanOrEqual(70);
      expect(check.detail).toContain("paragraph length");
    });

    test("old label Tone Consistency no longer exists", () => {
      const data = makePageData({
        paragraphs: [
          "Short paragraph here with some words.",
          "Another short paragraph with similar length.",
        ],
      });
      const results = runMarketingChecks(data);
      const check = results.find(r => r.label === "Tone Consistency");
      expect(check).toBeUndefined();
    });
  });
});
