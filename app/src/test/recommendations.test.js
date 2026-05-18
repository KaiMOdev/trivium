// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { describe, test, expect } from "vitest";
import { generateRecommendations, computeInsightsSummary } from "../utils/recommendations";

const mockSeoChecks = [
  { label: "Title Tag", status: "pass", detail: "55 chars — optimal", score: 95 },
  { label: "Meta Description", status: "fail", detail: "Missing", score: 0 },
  { label: "H1 Heading", status: "warn", detail: "Multiple H1s found", score: 50 },
  { label: "Canonical URL", status: "fail", detail: "No canonical tag", score: 0 },
  { label: "Robots.txt", status: "pass", detail: "Accessible", score: 90 },
  { label: "Schema Markup", status: "warn", detail: "No structured data", score: 40 },
  { label: "HTTPS / SSL", status: "pass", detail: "Valid SSL", score: 100 },
  { label: "Image Alt Text", status: "warn", detail: "3 of 8 images missing alt", score: 55 },
  { label: "Mobile Viewport", status: "pass", detail: "Viewport tag present", score: 100 },
];

const mockLlmChecks = [
  { label: "Content Structure", score: 35, detail: "Poor heading hierarchy" },
  { label: "FAQ Content", score: 80, detail: "FAQ section found" },
  { label: "Citation Readiness", score: 40, detail: "No author attribution" },
];

const mockMarketingChecks = [
  { label: "Call-to-Action", score: 30, detail: "No clear CTA found" },
  { label: "Trust Signals", score: 60, detail: "1 testimonial found" },
  { label: "Value Proposition", score: 20, detail: "No clear value statement" },
];

const mockResults = {
  seo: mockSeoChecks,
  llm: mockLlmChecks,
  marketing: mockMarketingChecks,
  scores: { seo: 62, llm: 52, marketing: 37 },
};

describe("generateRecommendations", () => {
  test("returns empty array for null results", () => {
    expect(generateRecommendations(null, "pro")).toEqual([]);
  });

  test("skips passing checks", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const labels = recs.map((r) => r.sourceLabel);
    expect(labels).not.toContain("Title Tag");
    expect(labels).not.toContain("Robots.txt");
    expect(labels).not.toContain("HTTPS / SSL");
    expect(labels).not.toContain("Mobile Viewport");
  });

  test("includes failing and warning checks", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const labels = recs.map((r) => r.sourceLabel);
    expect(labels).toContain("Meta Description");
    expect(labels).toContain("H1 Heading");
    expect(labels).toContain("Canonical URL");
    expect(labels).toContain("Schema Markup");
    expect(labels).toContain("Image Alt Text");
  });

  test("marks failed meta description as critical", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const metaRec = recs.find((r) => r.sourceLabel === "Meta Description");
    expect(metaRec.priority).toBe("critical");
    expect(metaRec.impact).toBe("high");
    expect(metaRec.quickWin).toBe(true);
  });

  test("assigns correct categories", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const seoRec = recs.find((r) => r.sourceLabel === "Meta Description");
    const llmRec = recs.find((r) => r.sourceLabel === "Content Structure");
    const mktRec = recs.find((r) => r.sourceLabel === "Call-to-Action");
    expect(seoRec.category).toBe("seo");
    expect(llmRec.category).toBe("llm");
    expect(mktRec.category).toBe("marketing");
  });

  test("sorts critical items first", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const criticalIdx = recs.findIndex((r) => r.priority === "critical");
    const optionalIdx = recs.findIndex((r) => r.priority === "optional");
    if (criticalIdx >= 0 && optionalIdx >= 0) {
      expect(criticalIdx).toBeLessThan(optionalIdx);
    }
  });

  test("free tier excludes LLM and marketing recommendations", () => {
    const recs = generateRecommendations(mockResults, "free");
    const categories = [...new Set(recs.map((r) => r.category))];
    expect(categories).toContain("seo");
    expect(categories).not.toContain("llm");
    expect(categories).not.toContain("marketing");
  });

  test("pro tier includes all categories", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const categories = [...new Set(recs.map((r) => r.category))];
    expect(categories).toContain("seo");
    expect(categories).toContain("llm");
    expect(categories).toContain("marketing");
  });

  test("every recommendation has required fields", () => {
    const recs = generateRecommendations(mockResults, "pro");
    recs.forEach((rec) => {
      expect(rec).toHaveProperty("category");
      expect(rec).toHaveProperty("priority");
      expect(rec).toHaveProperty("impact");
      expect(rec).toHaveProperty("effort");
      expect(rec).toHaveProperty("quickWin");
      expect(rec).toHaveProperty("title");
      expect(rec).toHaveProperty("description");
      expect(rec).toHaveProperty("sourceLabel");
      expect(["seo", "llm", "marketing"]).toContain(rec.category);
      expect(["critical", "important", "optional"]).toContain(rec.priority);
      expect(["high", "medium", "low"]).toContain(rec.impact);
      expect(["high", "medium", "low"]).toContain(rec.effort);
      expect(typeof rec.quickWin).toBe("boolean");
      expect(typeof rec.title).toBe("string");
      expect(rec.title.length).toBeGreaterThan(0);
    });
  });

  test("handles empty check arrays", () => {
    const emptyResults = { seo: [], llm: [], marketing: [] };
    const recs = generateRecommendations(emptyResults, "pro");
    expect(recs).toEqual([]);
  });

  test("handles all-passing checks", () => {
    const allPass = {
      seo: [{ label: "Title Tag", status: "pass", detail: "Good", score: 95 }],
      llm: [{ label: "Content Structure", score: 85, detail: "Good" }],
      marketing: [{ label: "CTA", score: 90, detail: "Strong CTA" }],
    };
    const recs = generateRecommendations(allPass, "pro");
    expect(recs).toEqual([]);
  });
});

describe("computeInsightsSummary", () => {
  test("counts priorities correctly", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const summary = computeInsightsSummary(recs, mockResults.scores);

    expect(summary.critical).toBe(recs.filter((r) => r.priority === "critical").length);
    expect(summary.important).toBe(recs.filter((r) => r.priority === "important").length);
    expect(summary.optional).toBe(recs.filter((r) => r.priority === "optional").length);
    expect(summary.quickWins).toBe(recs.filter((r) => r.quickWin).length);
    expect(summary.totalIssues).toBe(recs.length);
  });

  test("calculates potential gain", () => {
    const recs = generateRecommendations(mockResults, "pro");
    const summary = computeInsightsSummary(recs, mockResults.scores);
    expect(summary.potentialGain).toBeGreaterThan(0);
    expect(summary.potentialGain).toBeLessThanOrEqual(100);
  });

  test("handles empty recommendations", () => {
    const summary = computeInsightsSummary([], { seo: 95 });
    expect(summary.critical).toBe(0);
    expect(summary.important).toBe(0);
    expect(summary.optional).toBe(0);
    expect(summary.quickWins).toBe(0);
    expect(summary.totalIssues).toBe(0);
    expect(summary.potentialGain).toBe(0);
  });

  test("potential gain does not exceed remaining score headroom", () => {
    const recs = [
      { priority: "critical", quickWin: true, category: "seo" },
      { priority: "critical", quickWin: true, category: "seo" },
    ];
    const summary = computeInsightsSummary(recs, { seo: 98 });
    expect(summary.potentialGain).toBeLessThanOrEqual(2);
  });
});
