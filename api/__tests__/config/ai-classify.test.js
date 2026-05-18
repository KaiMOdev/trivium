const config = require("../../config/ai");

describe("AI classify config", () => {
  test("exports CLASSIFY_SYSTEM_PROMPT as a non-empty string", () => {
    expect(typeof config.CLASSIFY_SYSTEM_PROMPT).toBe("string");
    expect(config.CLASSIFY_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  test("CLASSIFY_SYSTEM_PROMPT contains classification enum values", () => {
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("ecommerce");
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("b2b");
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("sell-products");
  });

  test("CLASSIFY_SYSTEM_PROMPT contains all 4 check names", () => {
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("ctaRelevance");
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("valuePropClarity");
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("contentAudienceFit");
    expect(config.CLASSIFY_SYSTEM_PROMPT).toContain("brandConsistency");
  });

  test("exports AI_CLASSIFY_MAX_TOKENS as a number", () => {
    expect(typeof config.AI_CLASSIFY_MAX_TOKENS).toBe("number");
    expect(config.AI_CLASSIFY_MAX_TOKENS).toBeGreaterThanOrEqual(512);
  });

  test("exports CLASSIFY_PROMPT_VERSION as a non-empty string", () => {
    expect(typeof config.CLASSIFY_PROMPT_VERSION).toBe("string");
    expect(config.CLASSIFY_PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});
