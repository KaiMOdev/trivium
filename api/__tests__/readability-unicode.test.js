const { analyzeReadability } = require("../utils/readability");

describe("analyzeReadability — Unicode support", () => {
  test("handles French text with accented characters", () => {
    const text = "Le café est très agréable. Les résumés sont disponibles. L'été arrive bientôt.";
    const result = analyzeReadability(text);
    expect(result.avgSentenceLength).toBeGreaterThan(0);
    expect(result.fleschReadingEase).toBeGreaterThan(0);
  });

  test("handles German text with umlauts", () => {
    const text = "Die Überprüfung war erfolgreich. Der Bäcker öffnet früh. Das Mädchen läuft schnell.";
    const result = analyzeReadability(text);
    expect(result.avgSentenceLength).toBeGreaterThan(0);
    expect(result.fleschReadingEase).toBeGreaterThan(0);
  });

  test("handles Dutch text", () => {
    const text = "De geïntegreerde oplossing werkt goed. Het café is open vandaag.";
    const result = analyzeReadability(text);
    expect(result.avgSentenceLength).toBeGreaterThan(0);
  });

  test("handles mixed ASCII and accented content", () => {
    const text = "Welcome to our café. Enjoy the résumé of our über-creative team.";
    const result = analyzeReadability(text);
    // "café" should be counted as one word, not split at the accent
    expect(result.avgSentenceLength).toBeGreaterThan(0);
    expect(result.fleschReadingEase).toBeGreaterThan(0);
  });

  test("handles text with no ASCII letters (all Unicode)", () => {
    const text = "Üniversité éducation. Ärzte überprüfen.";
    const result = analyzeReadability(text);
    expect(result.avgSentenceLength).toBeGreaterThan(0);
  });
});
