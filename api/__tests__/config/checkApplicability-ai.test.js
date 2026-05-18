const { shouldSkipCheck } = require("../../config/checkApplicability");

describe("AI check applicability", () => {
  const AI_CHECKS = ["CTA Relevance", "Value Prop Clarity", "Brand Consistency", "Content-Audience Fit"];

  test("legal pages skip all 4 AI checks", () => {
    for (const check of AI_CHECKS) {
      expect(shouldSkipCheck("legal", check)).toBe(true);
    }
  });

  test("auth pages skip all 4 AI checks", () => {
    for (const check of AI_CHECKS) {
      expect(shouldSkipCheck("auth", check)).toBe(true);
    }
  });

  test("utility pages skip all 4 AI checks", () => {
    for (const check of AI_CHECKS) {
      expect(shouldSkipCheck("utility", check)).toBe(true);
    }
  });

  test("generic pages do NOT skip AI checks", () => {
    for (const check of AI_CHECKS) {
      expect(shouldSkipCheck("generic", check)).toBe(false);
    }
  });

  test("homepage does NOT skip AI checks", () => {
    for (const check of AI_CHECKS) {
      expect(shouldSkipCheck("homepage", check)).toBe(false);
    }
  });

  test("product pages do NOT skip AI checks", () => {
    for (const check of AI_CHECKS) {
      expect(shouldSkipCheck("product", check)).toBe(false);
    }
  });
});
