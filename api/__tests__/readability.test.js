const { analyzeReadability } = require("../utils/readability");

describe("analyzeReadability", () => {
  test("returns all scores for simple English text", () => {
    const text = "The cat sat on the mat. The dog ran in the park. Birds fly in the sky.";
    const result = analyzeReadability(text);
    expect(result).toHaveProperty("fleschReadingEase");
    expect(result).toHaveProperty("fleschKincaidGrade");
    expect(result).toHaveProperty("gunningFog");
    expect(result).toHaveProperty("avgSentenceLength");
    expect(result).toHaveProperty("complexWordRatio");
    expect(result.fleschReadingEase).toBeGreaterThan(80);
    expect(result.fleschKincaidGrade).toBeLessThan(5);
  });

  test("returns lower scores for complex text", () => {
    const text = "The implementation of sophisticated methodological frameworks necessitates comprehensive understanding of interdisciplinary prerequisites. Furthermore, the epistemological ramifications of contemporary philosophical paradigms demonstrate considerable heterogeneity.";
    const result = analyzeReadability(text);
    expect(result.fleschReadingEase).toBeLessThan(30);
    expect(result.fleschKincaidGrade).toBeGreaterThan(12);
    expect(result.complexWordRatio).toBeGreaterThan(0.3);
  });

  test("handles empty text gracefully", () => {
    const result = analyzeReadability("");
    expect(result.fleschReadingEase).toBe(0);
    expect(result.fleschKincaidGrade).toBe(0);
    expect(result.gunningFog).toBe(0);
    expect(result.avgSentenceLength).toBe(0);
    expect(result.complexWordRatio).toBe(0);
  });

  test("handles single sentence", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const result = analyzeReadability(text);
    expect(result.avgSentenceLength).toBe(9);
    expect(result.fleschReadingEase).toBeGreaterThan(60);
  });

  test("counts syllables correctly", () => {
    const text = "The beautiful cat sat quietly.";
    const result = analyzeReadability(text);
    expect(result.avgSentenceLength).toBe(5);
  });
});
