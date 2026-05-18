// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * SEO check definitions.
 * Mock fallback data — real checks run on the backend.
 */
export function runSeoChecks(/* html, url */) {
  return [
    { label: "Title Tag", status: "pass", detail: "55 chars — optimal length", score: 95 },
    { label: "Meta Description", status: "warn", detail: "168 chars — slightly over 160 limit", score: 65 },
    { label: "H1 Tag", status: "pass", detail: "1 H1 found, clear hierarchy", score: 100 },
    { label: "Heading Hierarchy", status: "pass", detail: "Proper H1 > H2 > H3 nesting", score: 100 },
    { label: "Image Alt Tags", status: "fail", detail: "12 of 34 images missing alt text", score: 35 },
    { label: "Canonical URL", status: "pass", detail: "Self-referencing canonical present", score: 100 },
    { label: "Open Graph Tags", status: "warn", detail: "og:image missing", score: 50 },
    { label: "JSON-LD Schema", status: "fail", detail: "No structured data found", score: 0 },
    { label: "Schema Completeness", status: "fail", detail: "No schema to validate", score: 0 },
    { label: "Meta Robots", status: "pass", detail: "No restrictive robots directives", score: 100 },
    { label: "Mobile Viewport", status: "pass", detail: "Viewport meta tag configured", score: 100 },
    { label: "robots.txt", status: "pass", detail: "Accessible, no critical blocks", score: 90 },
    { label: "SSL Certificate", status: "pass", detail: "Site served over HTTPS", score: 100 },
    // Hreflang Tags: only included when site has multiple languages (excluded from mock)
    { label: "Internal Linking", status: "pass", detail: "15 internal links — strong structure", score: 85 },
    { label: "Content Depth", status: "pass", detail: "850 words — adequate content length", score: 75 },
    { label: "Content-to-Code Ratio", status: "warn", detail: "18% text ratio — could improve", score: 60 },
  ];
}

const SEO_WEIGHTS = {
  "Title Tag": 3, "Meta Description": 3, "H1 Tag": 3,
  "SSL Certificate": 3, "Meta Robots": 3, "Mobile Viewport": 3,
  "Heading Hierarchy": 2, "Image Alt Tags": 2, "JSON-LD Schema": 2,
  "robots.txt": 2, "Content Depth": 2, "Internal Linking": 2,
  "Canonical URL": 1, "Open Graph Tags": 1, "Schema Completeness": 1,
  "Hreflang Tags": 1, "Content-to-Code Ratio": 1,
};

export function getSeoScore(results) {
  if (results.length === 0) return 0;
  let totalWeight = 0, weightedSum = 0;
  for (const r of results) {
    if (!(r.label in SEO_WEIGHTS)) continue;
    const w = SEO_WEIGHTS[r.label];
    weightedSum += r.score * w;
    totalWeight += w;
  }
  return totalWeight === 0 ? 0 : Math.round(weightedSum / totalWeight);
}
