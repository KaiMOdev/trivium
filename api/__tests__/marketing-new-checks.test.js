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
    ctaElements: [],
    trustElements: [],
    formFields: [],
    logoDetected: { found: false, location: "none", type: "none" },
    loadedFonts: [],
    inlineColorPairs: [],
    hasTestimonials: true,
    hasSocialProof: true,
    hasTrustBadges: false,
    hasReviewSchema: false,
    ratingElements: [],
    hasPrivacyLink: false,
    hasTermsLink: false,
    hasCookieConsent: false,
    hasCookiePolicyLink: false,
    og: {},
    jsonLd: [],
    jsonLdEntities: [],
    blockquoteCount: 0,
    images: [],
    totalImagesForLazy: 0,
    lazyImages: 0,
    hasFontDisplaySwap: true,
    preconnectCount: 0,
    semanticLandmarks: { header: 1, nav: 1, main: 1, footer: 1 },
    ariaLandmarks: [],
    headings: [{ level: 1, text: "Grow Your Business" }],
    visibleText: "Grow your business with data-driven marketing.",
    pageType: "homepage",
    lang: "en",
    ...overrides,
  };
}

describe("Benefit vs. Feature Language check", () => {
  function getCheck(overrides) {
    const results = runMarketingChecks(makePageData(overrides));
    return results.find((r) => r.label === "Benefit vs. Feature Language");
  }

  test("balanced messaging with quantified claims scores >= 85", () => {
    const check = getCheck({
      paragraphs: [
        "Save 10 hours per month with our automated reporting — boost productivity by 40%.",
        "Our platform includes a real-time dashboard and integrates with your existing stack.",
        "Increase revenue by 25% while reducing manual effort by half.",
        "Built with enterprise-grade encryption and supports SSO configuration.",
        "Achieve 3x faster results and eliminate repetitive tasks for your team.",
        "Features advanced API endpoints and webhook integrations for developers.",
      ],
    });
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  test("all-benefit no-specifics scores <= 50", () => {
    const check = getCheck({
      paragraphs: [
        "Improve your business and grow faster than ever before.",
        "Simplify your workflow and save time every single day.",
        "Boost your results and achieve more with less effort.",
        "Transform the way you work and unlock your potential.",
        "Enhance your productivity and streamline operations effortlessly.",
        "Empower your team and accelerate growth reliably.",
      ],
    });
    expect(check.score).toBeLessThanOrEqual(50);
  });

  test("all-feature scores <= 35", () => {
    const check = getCheck({
      paragraphs: [
        "Built with React and powered by Node.js on our cloud infrastructure.",
        "Features an API with webhook endpoints and SDK support.",
        "Includes a dashboard interface with export and import capabilities.",
        "Supports integration with database storage and encryption modules.",
        "Compatible with all major platforms and framework versions.",
        "Equipped with advanced configuration settings and parameters.",
      ],
    });
    expect(check.score).toBeLessThanOrEqual(35);
  });

  test("returns na for unsupported language", () => {
    const check = getCheck({ lang: "ar" });
    expect(check.status).toBe("na");
    expect(check.detail).toMatch(/not supported/i);
  });

  test("skipped on article pages", () => {
    const check = getCheck({ pageType: "article" });
    expect(check.status).toBe("na");
  });
});

describe("Urgency & Scarcity check", () => {
  function getCheck(overrides) {
    const results = runMarketingChecks(makePageData(overrides));
    return results.find((r) => r.label === "Urgency & Scarcity");
  }

  test("product page with both urgency and scarcity signals scores >= 80", () => {
    const check = getCheck({
      pageType: "product",
      paragraphs: [
        "Limited time offer — act now before this deal expires!",
        "Only 3 left in stock. Exclusive access for members only.",
        "Hurry, sale ends today. Don't miss out on this limited edition item.",
      ],
    });
    expect(check.score).toBeGreaterThanOrEqual(80);
  });

  test("service page with no signals scores 70", () => {
    const check = getCheck({
      pageType: "service",
      paragraphs: [
        "We provide reliable consulting services for growing businesses.",
        "Our team of experts will help you build a solid strategy.",
        "Contact us to learn more about our professional offerings.",
      ],
    });
    expect(check.score).toBe(70);
  });

  test("excessive signals (11+) get penalized", () => {
    const check = getCheck({
      pageType: "product",
      paragraphs: [
        "Limited time act now hurry ends soon last chance final chance don't miss don't wait",
        "Today only flash sale countdown hours left days left closing soon deadline expires",
        "Only 3 left limited stock exclusive members only rare edition sold out soon",
      ],
    });
    expect(check.score).toBeLessThan(80);
    expect(check.detail).toMatch(/Excessive/);
  });
});

describe("Emotional Trigger Words check", () => {
  function getCheck(overrides) {
    const results = runMarketingChecks(makePageData(overrides));
    return results.find((r) => r.label === "Emotional Trigger Words");
  }

  test("moderate triggers across 3-4 categories scores >= 85", () => {
    const check = getCheck({
      paragraphs: [
        "Our guaranteed platform is used by thousands of businesses.",
        "Get exclusive access to new features before anyone else.",
        "Discover the surprising results behind our approach.",
        "It is easy to get started with no complicated setup required.",
      ],
    });
    expect(check.score).toBeGreaterThanOrEqual(85);
  });

  test("excessive triggers (13+) across 4 categories get penalized (score <= 70)", () => {
    const check = getCheck({
      paragraphs: [
        "Guaranteed proven certified verified authentic official secure safe protected risk-free money-back warranty trusted reliable.",
        "Exclusive premium elite luxury ultimate superior world-class high-end deluxe bespoke custom tailored personalized.",
        "Secret surprising unexpected little-known shocking mind-blowing remarkable extraordinary incredible fascinating.",
        "Easy simple effortless seamless intuitive free instant immediate quick fast powerful robust comprehensive.",
      ],
    });
    expect(check.score).toBeLessThanOrEqual(70);
  });

  test("no triggers scores 40", () => {
    const check = getCheck({
      paragraphs: [
        "The system processes data through a standard interface.",
        "Users can configure settings from the administration panel.",
        "Reports are generated on a weekly basis for review.",
      ],
    });
    expect(check.score).toBe(40);
  });
});

describe("Headline Formula Quality check", () => {
  function getCheck(overrides) {
    const results = runMarketingChecks(makePageData(overrides));
    return results.find((r) => r.label === "Headline Formula Quality");
  }

  test("multiple formula types (number-led, how-to, question, comparison) scores >= 85 with items", () => {
    const check = getCheck({
      h1s: ["10 Ways to Boost Your SEO"],
      headings: {
        h2: ["How to Optimize Your Site", "React vs Angular: Which Is Better?"],
        h3: ["Why Should You Care About Performance?"],
      },
    });
    expect(check.score).toBeGreaterThanOrEqual(85);
    expect(check.items.length).toBeGreaterThanOrEqual(3);
  });

  test("no formula headings scores 30", () => {
    const check = getCheck({
      h1s: ["About Us"],
      headings: {
        h2: ["Our Team", "Contact"],
        h3: [],
      },
    });
    expect(check.score).toBe(30);
  });

  test("runs on article pages (not na) with how-to heading scores >= 50", () => {
    const check = getCheck({
      pageType: "article",
      h1s: ["How to Write Better Headlines"],
      headings: { h2: [], h3: [] },
    });
    expect(check.status).not.toBe("na");
    expect(check.score).toBeGreaterThanOrEqual(50);
  });
});

describe("Above-Fold Messaging check", () => {
  function getCheck(overrides) {
    const results = runMarketingChecks(makePageData(overrides));
    return results.find((r) => r.label === "Above-Fold Messaging");
  }

  test("all 3 signals present scores >= 90", () => {
    const check = getCheck({
      h1s: ["The Analytics Platform for Digital Agencies"],
      paragraphs: [
        "We help marketing teams measure what matters and grow faster.",
        "Built for agencies that need real-time dashboards and client reporting.",
        "Join thousands of satisfied customers who trust our platform.",
      ],
      logoDetected: { found: true, location: "header", type: "img" },
      jsonLdEntities: [{ "@type": "Organization", name: "Acme Corp" }],
    });
    expect(check.score).toBeGreaterThanOrEqual(90);
  });

  test("missing audience reduces score to <= 70", () => {
    const check = getCheck({
      h1s: ["The Best Analytics Platform"],
      paragraphs: [
        "Our platform provides real-time dashboards and reporting tools.",
        "We help businesses track their key metrics effortlessly.",
        "Get started in minutes with our simple setup process.",
      ],
      logoDetected: { found: true, location: "header", type: "img" },
      jsonLdEntities: [{ "@type": "Organization", name: "Acme Corp" }],
    });
    expect(check.score).toBeLessThanOrEqual(70);
  });

  test("no signals scores <= 20", () => {
    const check = getCheck({
      h1s: ["Welcome"],
      paragraphs: [
        "Check out the latest updates.",
        "Browse our collection of resources.",
        "Stay informed with industry news.",
      ],
      logoDetected: { found: false, location: "none", type: "none" },
      og: {},
      jsonLdEntities: [],
    });
    expect(check.score).toBeLessThanOrEqual(20);
  });
});

describe("Social Proof Signals check", () => {
  function getCheck(overrides) {
    const results = runMarketingChecks(makePageData(overrides));
    return results.find((r) => r.label === "Social Proof Signals");
  }

  test("multiple signal types (testimonials + count + logos + case studies + awards) scores >= 85 with items array", () => {
    const check = getCheck({
      paragraphs: [
        "What our customers say about our platform and service.",
        "Trusted by 10,000+ businesses worldwide for reliable analytics.",
        "As seen in Forbes, TechCrunch, and Wired media outlets.",
        "Read our case studies to see proven results and real ROI.",
        "Award-winning platform certified by ISO standards.",
      ],
      hasReviewSchema: true,
      blockquoteCount: 3,
      hasTrustBadges: true,
    });
    expect(check.score).toBeGreaterThanOrEqual(85);
    expect(check.items).toBeDefined();
    expect(Array.isArray(check.items)).toBe(true);
  });

  test("no social proof (neutral paragraphs, all flags false) scores 25", () => {
    const check = getCheck({
      paragraphs: [
        "The platform processes data through a standard interface.",
        "Users can configure settings from the administration panel.",
        "Reports are generated on a weekly basis for review.",
      ],
      hasReviewSchema: false,
      blockquoteCount: 0,
      hasTrustBadges: false,
      ratingElements: [],
    });
    expect(check.score).toBe(25);
  });

  test("customer count regex detects 'Trusted by 5,000+ businesses' and scores >= 50", () => {
    const check = getCheck({
      paragraphs: [
        "Trusted by 5,000+ businesses around the world.",
        "Our platform helps teams collaborate more effectively.",
        "Simple setup process with no technical knowledge required.",
      ],
      hasReviewSchema: false,
      blockquoteCount: 0,
      hasTrustBadges: false,
      ratingElements: [],
    });
    expect(check.score).toBeGreaterThanOrEqual(50);
  });
});

describe("Value Proposition upgrade", () => {
  test("quantified differentiated VP scores higher than generic", () => {
    const specific = makePageData({
      h1s: ["Reduce Churn by 23% — The Only Platform That Guarantees Results"],
      paragraphs: ["Unlike other tools, we help you save 10 hours per week."],
    });
    const generic = makePageData({
      h1s: ["Welcome to Our Company"],
      paragraphs: ["We are the best in class provider of solutions."],
    });
    const specificResults = runMarketingChecks(specific);
    const genericResults = runMarketingChecks(generic);
    const sVP = specificResults.find(r => r.label === "Value Proposition");
    const gVP = genericResults.find(r => r.label === "Value Proposition");
    expect(sVP.score).toBeGreaterThan(gVP.score);
  });
});

describe("CTA Effectiveness upgrade", () => {
  test("first-person CTA scores higher than third-person", () => {
    const fp = makePageData({ ctas: ["Get My Free Report"] });
    const tp = makePageData({ ctas: ["Get Report"] });
    const fpResults = runMarketingChecks(fp);
    const tpResults = runMarketingChecks(tp);
    const fpCTA = fpResults.find(r => r.label === "CTA Effectiveness");
    const tpCTA = tpResults.find(r => r.label === "CTA Effectiveness");
    expect(fpCTA.score).toBeGreaterThan(tpCTA.score);
  });
});

// ── Integration Tests ──
describe("Marketing checks integration", () => {
  test("returns 26 checks for homepage", () => {
    const results = runMarketingChecks(makePageData());
    expect(results).toHaveLength(26);
  });

  test("all checks have valid shape", () => {
    const results = runMarketingChecks(makePageData());
    results.forEach(r => {
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("detail");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  test("new check labels are present", () => {
    const results = runMarketingChecks(makePageData());
    const labels = results.map(r => r.label);
    expect(labels).toContain("Benefit vs. Feature Language");
    expect(labels).toContain("Urgency & Scarcity");
    expect(labels).toContain("Emotional Trigger Words");
    expect(labels).toContain("Headline Formula Quality");
    expect(labels).toContain("Above-Fold Messaging");
    expect(labels).toContain("Social Proof Signals");
  });

  test("unsupported language returns na for new checks", () => {
    const data = makePageData({ lang: "ar" });
    const results = runMarketingChecks(data);
    const newChecks = [
      "Benefit vs. Feature Language", "Urgency & Scarcity",
      "Emotional Trigger Words", "Headline Formula Quality",
      "Above-Fold Messaging", "Social Proof Signals",
    ];
    newChecks.forEach(label => {
      const check = results.find(r => r.label === label);
      expect(check.status).toBe("na");
    });
  });

  test("Dutch language detection works end-to-end", () => {
    const data = makePageData({
      lang: "nl-BE",
      paragraphs: [
        "Bespaar 10 uur per week met onze geautomatiseerde rapportage.",
        "Ons platform integreert met 50+ tools.",
      ],
    });
    const results = runMarketingChecks(data);
    const bf = results.find(r => r.label === "Benefit vs. Feature Language");
    expect(bf.score).toBeGreaterThan(0);
    expect(bf.status).not.toBe("na");
  });
});
