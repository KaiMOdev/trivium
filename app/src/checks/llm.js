// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * LLM readiness check definitions.
 * Mock fallback data — real checks run on the backend.
 */
export function runLlmChecks(/* html, url */) {
  return [
    { label: "AI Crawler Access", score: 85, detail: "Most AI crawlers allowed — check robots.txt for GPTBot, ClaudeBot, PerplexityBot" },
    { label: "Content Clarity", score: 72, detail: "Main offering identifiable but buried below fold" },
    { label: "Answer Capsules", score: 30, detail: "No concise definition paragraphs found after headings" },
    { label: "Content Extractability", score: 55, detail: "Lists found but no comparison tables for AI to cite" },
    { label: "Citation Worthiness", score: 45, detail: "Lacks specific data points, statistics, or unique claims" },
    { label: "Author & Expertise", score: 20, detail: "No author schema or expertise signals found" },
    { label: "Source Attribution", score: 35, detail: "Few external source links or citations" },
    { label: "Entity Recognition", score: 83, detail: "Business name and services clearly stated via structured data" },
    { label: "FAQ Presence", score: 20, detail: "No FAQ section or structured Q&A content found" },
    { label: "Answer Density", score: 58, detail: "Some paragraphs are too vague for AI extraction" },
    { label: "Freshness Signals", score: 35, detail: "Last updated date missing, no recent content indicators" },
  ];
}

const LLM_WEIGHTS = {
  "AI Crawler Access": 3, "Content Clarity": 3, "Answer Capsules": 3,
  "Content Extractability": 2, "Citation Worthiness": 2,
  "Entity Recognition": 2, "FAQ Presence": 2,
  "Author & Expertise": 1, "Source Attribution": 1,
  "Answer Density": 1, "Freshness Signals": 1,
};

export function getLlmScore(results) {
  if (results.length === 0) return 0;
  let totalWeight = 0, weightedSum = 0;
  for (const r of results) {
    const w = LLM_WEIGHTS[r.label] || 1;
    weightedSum += r.score * w;
    totalWeight += w;
  }
  return Math.round(weightedSum / totalWeight);
}
