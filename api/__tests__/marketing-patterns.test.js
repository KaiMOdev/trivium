"use strict";

const {
  SUPPORTED_LANGS,
  detectLang,
  BENEFIT_PATTERNS,
  FEATURE_PATTERNS,
  QUANTIFICATION_PATTERNS,
  URGENCY_PATTERNS,
  SCARCITY_PATTERNS,
  EMOTIONAL_PATTERNS,
  HEADLINE_PATTERNS,
  OFFERING_PATTERNS,
  AUDIENCE_PATTERNS,
  SOCIAL_PROOF_PATTERNS,
} = require("../checks/marketing-patterns");

const ALL_LANG_CODES = ["en", "nl", "fr", "de", "es", "it", "pt", "ja", "zh", "ko"];

describe("SUPPORTED_LANGS", () => {
  it("has all 10 language codes", () => {
    expect(Object.keys(SUPPORTED_LANGS)).toEqual(expect.arrayContaining(ALL_LANG_CODES));
    expect(Object.keys(SUPPORTED_LANGS)).toHaveLength(10);
  });

  it("maps codes to display names", () => {
    expect(SUPPORTED_LANGS.en).toBe("English");
    expect(SUPPORTED_LANGS.nl).toBe("Dutch");
    expect(SUPPORTED_LANGS.fr).toBe("French");
    expect(SUPPORTED_LANGS.de).toBe("German");
    expect(SUPPORTED_LANGS.ja).toBe("Japanese");
  });
});

describe("detectLang", () => {
  it("normalizes regional variant to base lang (nl-BE → nl)", () => {
    const result = detectLang({ lang: "nl-BE" });
    expect(result).toEqual({ lang: "nl", name: "Dutch", supported: true });
  });

  it("returns en with noTag when no lang attribute", () => {
    const result = detectLang({});
    expect(result).toEqual({ lang: "en", name: "English", supported: true, noTag: true });
  });

  it("returns en with noTag for empty string lang", () => {
    const result = detectLang({ lang: "" });
    expect(result).toEqual({ lang: "en", name: "English", supported: true, noTag: true });
  });

  it("marks unsupported languages", () => {
    const result = detectLang({ lang: "ar" });
    expect(result.supported).toBe(false);
    expect(result.lang).toBe("ar");
    expect(result.name).toBe("ar");
  });

  it("normalizes full locale pt-BR to pt", () => {
    const result = detectLang({ lang: "pt-BR" });
    expect(result).toEqual({ lang: "pt", name: "Portuguese", supported: true });
  });

  it("handles uppercase lang tags", () => {
    const result = detectLang({ lang: "FR" });
    expect(result).toEqual({ lang: "fr", name: "French", supported: true });
  });

  it("handles zh-CN and zh-TW", () => {
    expect(detectLang({ lang: "zh-CN" }).lang).toBe("zh");
    expect(detectLang({ lang: "zh-TW" }).lang).toBe("zh");
  });
});

describe("BENEFIT_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(BENEFIT_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(BENEFIT_PATTERNS[code])).toBe(true);
    }
  });

  it("each language has at least 10 entries", () => {
    for (const code of ALL_LANG_CODES) {
      expect(BENEFIT_PATTERNS[code].length).toBeGreaterThan(10);
    }
  });

  it("EN has 60+ entries", () => {
    expect(BENEFIT_PATTERNS.en.length).toBeGreaterThanOrEqual(60);
  });

  it("EN contains expected patterns", () => {
    expect(BENEFIT_PATTERNS.en).toContain("save");
    expect(BENEFIT_PATTERNS.en).toContain("increase");
    expect(BENEFIT_PATTERNS.en).toContain("you get");
  });

  it("NL contains expected patterns", () => {
    expect(BENEFIT_PATTERNS.nl).toContain("bespaar");
    expect(BENEFIT_PATTERNS.nl).toContain("verhoog");
  });

  it("FR contains expected patterns", () => {
    expect(BENEFIT_PATTERNS.fr).toContain("économisez");
    expect(BENEFIT_PATTERNS.fr).toContain("augmentez");
  });

  it("all entries are non-empty strings", () => {
    for (const code of ALL_LANG_CODES) {
      for (const pattern of BENEFIT_PATTERNS[code]) {
        expect(typeof pattern).toBe("string");
        expect(pattern.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("FEATURE_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(FEATURE_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(FEATURE_PATTERNS[code])).toBe(true);
    }
  });

  it("each language has at least 10 entries", () => {
    for (const code of ALL_LANG_CODES) {
      expect(FEATURE_PATTERNS[code].length).toBeGreaterThan(10);
    }
  });

  it("EN has 20+ entries", () => {
    expect(FEATURE_PATTERNS.en.length).toBeGreaterThanOrEqual(20);
  });

  it("EN contains expected patterns", () => {
    expect(FEATURE_PATTERNS.en).toContain("built with");
    expect(FEATURE_PATTERNS.en).toContain("powered by");
    expect(FEATURE_PATTERNS.en).toContain("compatible with");
  });

  it("all entries are non-empty strings", () => {
    for (const code of ALL_LANG_CODES) {
      for (const pattern of FEATURE_PATTERNS[code]) {
        expect(typeof pattern).toBe("string");
        expect(pattern.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("QUANTIFICATION_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(QUANTIFICATION_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(QUANTIFICATION_PATTERNS[code])).toBe(true);
      expect(QUANTIFICATION_PATTERNS[code].length).toBeGreaterThan(0);
    }
  });

  it("EN contains expected unit words", () => {
    expect(QUANTIFICATION_PATTERNS.en).toContain("percent");
    expect(QUANTIFICATION_PATTERNS.en).toContain("faster");
    expect(QUANTIFICATION_PATTERNS.en).toContain("customers");
  });
});

describe("URGENCY_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(URGENCY_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(URGENCY_PATTERNS[code])).toBe(true);
      expect(URGENCY_PATTERNS[code].length).toBeGreaterThan(0);
    }
  });

  it("EN contains expected urgency phrases", () => {
    expect(URGENCY_PATTERNS.en).toContain("limited time");
    expect(URGENCY_PATTERNS.en).toContain("act now");
    expect(URGENCY_PATTERNS.en).toContain("last chance");
  });
});

describe("SCARCITY_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(SCARCITY_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(SCARCITY_PATTERNS[code])).toBe(true);
      expect(SCARCITY_PATTERNS[code].length).toBeGreaterThan(0);
    }
  });

  it("EN contains expected scarcity phrases", () => {
    expect(SCARCITY_PATTERNS.en).toContain("limited spots");
    expect(SCARCITY_PATTERNS.en).toContain("exclusive");
    expect(SCARCITY_PATTERNS.en).toContain("sold out");
  });
});

describe("EMOTIONAL_PATTERNS", () => {
  const CATEGORIES = ["trust", "exclusivity", "curiosity", "empowerment"];

  it("has objects with 4 categories for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(EMOTIONAL_PATTERNS).toHaveProperty(code);
      for (const cat of CATEGORIES) {
        expect(EMOTIONAL_PATTERNS[code]).toHaveProperty(cat);
        expect(Array.isArray(EMOTIONAL_PATTERNS[code][cat])).toBe(true);
        expect(EMOTIONAL_PATTERNS[code][cat].length).toBeGreaterThan(0);
      }
    }
  });

  it("EN trust contains expected words", () => {
    expect(EMOTIONAL_PATTERNS.en.trust).toContain("guaranteed");
    expect(EMOTIONAL_PATTERNS.en.trust).toContain("money-back");
  });

  it("EN curiosity contains expected words", () => {
    expect(EMOTIONAL_PATTERNS.en.curiosity).toContain("secret");
    expect(EMOTIONAL_PATTERNS.en.curiosity).toContain("hack");
  });
});

describe("HEADLINE_PATTERNS", () => {
  const PROPERTIES = ["numberLed", "howTo", "question", "outcomeDriven", "comparison"];

  it("has objects with 5 properties for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(HEADLINE_PATTERNS).toHaveProperty(code);
      for (const prop of PROPERTIES) {
        expect(HEADLINE_PATTERNS[code]).toHaveProperty(prop);
      }
    }
  });

  it("question and comparison are arrays of RegExp for all languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(Array.isArray(HEADLINE_PATTERNS[code].question)).toBe(true);
      expect(HEADLINE_PATTERNS[code].question.length).toBeGreaterThan(0);
      expect(Array.isArray(HEADLINE_PATTERNS[code].comparison)).toBe(true);
      expect(HEADLINE_PATTERNS[code].comparison.length).toBeGreaterThan(0);
    }
  });

  it("EN numberLed matches '7 Ways to Improve SEO'", () => {
    expect(HEADLINE_PATTERNS.en.numberLed.test("7 Ways to Improve SEO")).toBe(true);
  });

  it("EN howTo matches 'How to Improve Your SEO'", () => {
    expect(HEADLINE_PATTERNS.en.howTo.test("How to Improve Your SEO")).toBe(true);
  });

  it("EN outcomeDriven matches 'Boost Your Rankings'", () => {
    expect(HEADLINE_PATTERNS.en.outcomeDriven.test("Boost Your Rankings")).toBe(true);
  });

  it("EN question matches 'What is SEO?'", () => {
    expect(HEADLINE_PATTERNS.en.question[0].test("What is SEO?")).toBe(true);
  });

  it("EN comparison matches 'WordPress vs Shopify'", () => {
    expect(HEADLINE_PATTERNS.en.comparison[0].test("WordPress vs Shopify")).toBe(true);
  });
});

describe("OFFERING_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(OFFERING_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(OFFERING_PATTERNS[code])).toBe(true);
      expect(OFFERING_PATTERNS[code].length).toBeGreaterThan(0);
    }
  });

  it("EN contains expected offering phrases", () => {
    expect(OFFERING_PATTERNS.en).toContain("we help");
    expect(OFFERING_PATTERNS.en).toContain("our platform");
    expect(OFFERING_PATTERNS.en).toContain("built for");
  });
});

describe("AUDIENCE_PATTERNS", () => {
  it("has arrays for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(AUDIENCE_PATTERNS).toHaveProperty(code);
      expect(Array.isArray(AUDIENCE_PATTERNS[code])).toBe(true);
      expect(AUDIENCE_PATTERNS[code].length).toBeGreaterThan(0);
    }
  });

  it("EN contains expected audience phrases", () => {
    expect(AUDIENCE_PATTERNS.en).toContain("for startups");
    expect(AUDIENCE_PATTERNS.en).toContain("for developers");
    expect(AUDIENCE_PATTERNS.en).toContain("perfect for");
  });
});

describe("SOCIAL_PROOF_PATTERNS", () => {
  const CATEGORIES = ["testimonials", "clientLogos", "caseStudies", "awards"];

  it("has objects with 4 categories for all 10 languages", () => {
    for (const code of ALL_LANG_CODES) {
      expect(SOCIAL_PROOF_PATTERNS).toHaveProperty(code);
      for (const cat of CATEGORIES) {
        expect(SOCIAL_PROOF_PATTERNS[code]).toHaveProperty(cat);
        expect(Array.isArray(SOCIAL_PROOF_PATTERNS[code][cat])).toBe(true);
        expect(SOCIAL_PROOF_PATTERNS[code][cat].length).toBeGreaterThan(0);
      }
    }
  });

  it("EN testimonials contains expected words", () => {
    expect(SOCIAL_PROOF_PATTERNS.en.testimonials).toContain("testimonial");
    expect(SOCIAL_PROOF_PATTERNS.en.testimonials).toContain("5 stars");
  });

  it("EN awards contains expected words", () => {
    expect(SOCIAL_PROOF_PATTERNS.en.awards).toContain("award-winning");
    expect(SOCIAL_PROOF_PATTERNS.en.awards).toContain("ISO");
  });
});
