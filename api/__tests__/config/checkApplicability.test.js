const { shouldSkipCheck, SKIP_MAP } = require("../../config/checkApplicability");

describe("shouldSkipCheck", () => {
  it("skips homepage-irrelevant checks", () => {
    expect(shouldSkipCheck("homepage", "Breadcrumb Schema")).toBe(true);
    expect(shouldSkipCheck("homepage", "Answer Capsules")).toBe(true);
    expect(shouldSkipCheck("homepage", "Content Readability")).toBe(true);
  });

  it("does not skip universal checks on homepage", () => {
    expect(shouldSkipCheck("homepage", "Title Tag")).toBe(false);
    expect(shouldSkipCheck("homepage", "Meta Description")).toBe(false);
    expect(shouldSkipCheck("homepage", "SSL Certificate")).toBe(false);
  });

  it("skips article-irrelevant checks", () => {
    expect(shouldSkipCheck("article", "Value Proposition")).toBe(true);
    expect(shouldSkipCheck("article", "CTA Effectiveness")).toBe(true);
    expect(shouldSkipCheck("article", "Reviews & Ratings")).toBe(true);
  });

  it("does not skip content checks on articles", () => {
    expect(shouldSkipCheck("article", "Content Readability")).toBe(false);
    expect(shouldSkipCheck("article", "Answer Capsules")).toBe(false);
  });

  it("skips nothing for generic pages", () => {
    expect(shouldSkipCheck("generic", "Title Tag")).toBe(false);
    expect(shouldSkipCheck("generic", "Value Proposition")).toBe(false);
    expect(shouldSkipCheck("generic", "Answer Capsules")).toBe(false);
  });

  it("skips marketing and LLM content checks on legal pages", () => {
    expect(shouldSkipCheck("legal", "Value Proposition")).toBe(true);
    expect(shouldSkipCheck("legal", "Trust Signals")).toBe(true);
    expect(shouldSkipCheck("legal", "Logo Detection")).toBe(true);
    expect(shouldSkipCheck("legal", "Typography Quality")).toBe(true);
    expect(shouldSkipCheck("legal", "Content Readability")).toBe(true);
    expect(shouldSkipCheck("legal", "Sentence Complexity")).toBe(true);
    expect(shouldSkipCheck("legal", "Answer Density")).toBe(true);
    expect(shouldSkipCheck("legal", "Question Headings")).toBe(true);
    expect(shouldSkipCheck("legal", "Content Structure Consistency")).toBe(true);
  });

  it("keeps technical checks on legal pages", () => {
    expect(shouldSkipCheck("legal", "Image Lazy Loading")).toBe(false);
    expect(shouldSkipCheck("legal", "Font Display")).toBe(false);
    expect(shouldSkipCheck("legal", "Accessibility Landmarks")).toBe(false);
  });

  it("skips LLM and conversion marketing checks on utility pages", () => {
    expect(shouldSkipCheck("utility", "Answer Capsules")).toBe(true);
    expect(shouldSkipCheck("utility", "Citation Worthiness")).toBe(true);
    expect(shouldSkipCheck("utility", "Reviews & Ratings")).toBe(true);
    // Conversion-focused marketing checks should be skipped on about/contact
    expect(shouldSkipCheck("utility", "Value Proposition")).toBe(true);
    expect(shouldSkipCheck("utility", "CTA Effectiveness")).toBe(true);
    expect(shouldSkipCheck("utility", "Trust Signals")).toBe(true);
    expect(shouldSkipCheck("utility", "CTA Above Fold")).toBe(true);
    expect(shouldSkipCheck("utility", "CTA Copy Quality")).toBe(true);
    expect(shouldSkipCheck("utility", "Trust Near CTAs")).toBe(true);
    expect(shouldSkipCheck("utility", "Social Proof")).toBe(true);
    expect(shouldSkipCheck("utility", "Content Structure Consistency")).toBe(true);
    // Technical and UX checks should still run
    expect(shouldSkipCheck("utility", "Contact Visibility")).toBe(false);
    expect(shouldSkipCheck("utility", "Form Optimization")).toBe(false);
    expect(shouldSkipCheck("utility", "Image Lazy Loading")).toBe(false);
  });

  it("skips SEO content checks on legal pages (expanded)", () => {
    expect(shouldSkipCheck("legal", "Open Graph Tags")).toBe(true);
    expect(shouldSkipCheck("legal", "Content Depth")).toBe(true);
    expect(shouldSkipCheck("legal", "Schema Completeness")).toBe(true);
    expect(shouldSkipCheck("legal", "Breadcrumb Schema")).toBe(true);
    expect(shouldSkipCheck("legal", "AI Content Quality")).toBe(true);
    expect(shouldSkipCheck("legal", "Schema Currency")).toBe(true);
    expect(shouldSkipCheck("legal", "Privacy & Security")).toBe(true);
  });

  it("skips Contact Visibility and Trust Signals on article pages", () => {
    expect(shouldSkipCheck("article", "Contact Visibility")).toBe(true);
    expect(shouldSkipCheck("article", "Trust Signals")).toBe(true);
  });

  it("skips additional checks on product pages (expanded)", () => {
    expect(shouldSkipCheck("product", "Speakable Schema")).toBe(true);
    expect(shouldSkipCheck("product", "Content Readability")).toBe(true);
    expect(shouldSkipCheck("product", "Sentence Complexity")).toBe(true);
    expect(shouldSkipCheck("product", "Value Proposition")).toBe(true);
  });

  it("skips Content Depth on homepage", () => {
    expect(shouldSkipCheck("homepage", "Content Depth")).toBe(true);
  });

  it("skips marketing CTAs on FAQ pages but keeps LLM content checks", () => {
    expect(shouldSkipCheck("faq", "Value Proposition")).toBe(true);
    expect(shouldSkipCheck("faq", "CTA Effectiveness")).toBe(true);
    expect(shouldSkipCheck("faq", "Content Depth")).toBe(true);
    // FAQ pages should keep LLM checks
    expect(shouldSkipCheck("faq", "Answer Capsules")).toBe(false);
    expect(shouldSkipCheck("faq", "Question Headings")).toBe(false);
    expect(shouldSkipCheck("faq", "Definition Clarity")).toBe(false);
  });

  it("skips almost everything on auth pages except technical checks", () => {
    expect(shouldSkipCheck("auth", "Value Proposition")).toBe(true);
    expect(shouldSkipCheck("auth", "Answer Capsules")).toBe(true);
    expect(shouldSkipCheck("auth", "Content Depth")).toBe(true);
    expect(shouldSkipCheck("auth", "AI Content Quality")).toBe(true);
    expect(shouldSkipCheck("auth", "Open Graph Tags")).toBe(true);
    expect(shouldSkipCheck("auth", "Internal Linking")).toBe(true);
    // Technical checks should still run
    expect(shouldSkipCheck("auth", "Image Lazy Loading")).toBe(false);
    expect(shouldSkipCheck("auth", "Font Display")).toBe(false);
    expect(shouldSkipCheck("auth", "Accessibility Landmarks")).toBe(false);
    expect(shouldSkipCheck("auth", "Color Contrast")).toBe(false);
  });

  it("skips content-depth and LLM text checks on gallery pages", () => {
    expect(shouldSkipCheck("gallery", "Content Depth")).toBe(true);
    expect(shouldSkipCheck("gallery", "Content Readability")).toBe(true);
    expect(shouldSkipCheck("gallery", "AI Content Quality")).toBe(true);
    expect(shouldSkipCheck("gallery", "Answer Capsules")).toBe(true);
    expect(shouldSkipCheck("gallery", "Content Structure Consistency")).toBe(true);
    // Marketing should still run on gallery/portfolio
    expect(shouldSkipCheck("gallery", "Value Proposition")).toBe(false);
    expect(shouldSkipCheck("gallery", "CTA Effectiveness")).toBe(false);
  });

  it("skips LLM readability checks on landing pages", () => {
    expect(shouldSkipCheck("landing", "Answer Capsules")).toBe(true);
    expect(shouldSkipCheck("landing", "Content Readability")).toBe(true);
    expect(shouldSkipCheck("landing", "Sentence Complexity")).toBe(true);
    expect(shouldSkipCheck("landing", "Question Headings")).toBe(true);
    expect(shouldSkipCheck("landing", "Source Citations")).toBe(true);
    // Marketing should still run on landing pages
    expect(shouldSkipCheck("landing", "Value Proposition")).toBe(false);
    expect(shouldSkipCheck("landing", "CTA Effectiveness")).toBe(false);
  });

  it("skips marketing on support pages but keeps LLM content checks", () => {
    expect(shouldSkipCheck("support", "Value Proposition")).toBe(true);
    expect(shouldSkipCheck("support", "CTA Effectiveness")).toBe(true);
    expect(shouldSkipCheck("support", "Social Proof")).toBe(true);
    expect(shouldSkipCheck("support", "Trust Signals")).toBe(true);
    // Support pages are great content for AI citation — keep LLM checks
    expect(shouldSkipCheck("support", "Answer Capsules")).toBe(false);
    expect(shouldSkipCheck("support", "Question Headings")).toBe(false);
    expect(shouldSkipCheck("support", "Content Readability")).toBe(false);
    expect(shouldSkipCheck("support", "HowTo Schema")).toBe(false);
  });

  it("returns false for unknown page type", () => {
    expect(shouldSkipCheck("unknown", "Title Tag")).toBe(false);
  });
});
