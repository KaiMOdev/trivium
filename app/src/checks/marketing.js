// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Marketing effectiveness check definitions.
 * Mock fallback data — real checks run on the backend.
 */
export function runMarketingChecks(/* html, url */) {
  return [
    { label: "Value Proposition", score: 60, detail: "Present but generic — doesn't differentiate from competitors" },
    { label: "CTA Effectiveness", score: 78, detail: "Primary CTA above fold, good contrast, clear action verb" },
    { label: "Trust Signals", score: 45, detail: "No testimonials, reviews, or social proof visible" },
    { label: "Social Proof", score: 32, detail: "No case studies, logos, or testimonial sections found" },
    { label: "Reviews & Ratings", score: 15, detail: "No reviews or ratings found" },
    { label: "Video Content", score: 30, detail: "No video content detected" },
    { label: "Contact Visibility", score: 50, detail: "Only email contact found, add phone and form" },
    { label: "Privacy & Security", score: 55, detail: "Privacy policy found but missing terms of service" },
    { label: "Content Structure Consistency", score: 88, detail: "Paragraph lengths are consistent across scanned pages" },
    { label: "Benefit vs. Feature Language", score: 55, detail: "Feature-heavy messaging — lead with outcomes before specs" },
    { label: "Urgency & Scarcity", score: 60, detail: "No urgency signals — appropriate for trust-based messaging" },
    { label: "Emotional Trigger Words", score: 40, detail: "No emotional trigger words detected — add power words to headlines and CTAs" },
    { label: "Headline Formula Quality", score: 30, detail: "No headings use proven copywriting formulas" },
    { label: "Above-Fold Messaging", score: 65, detail: "Missing audience targeting — add who this is for" },
    { label: "Social Proof Signals", score: 25, detail: "No social proof elements detected" },
  ];
}

const MARKETING_WEIGHTS = {
  "Value Proposition": 3, "CTA Effectiveness": 3,
  "Trust Signals": 2, "Social Proof": 2, "Contact Visibility": 2,
  "Reviews & Ratings": 1, "Video Content": 1,
  "Privacy & Security": 1, "Content Structure Consistency": 1,
  "Benefit vs. Feature Language": 2, "Urgency & Scarcity": 1,
  "Emotional Trigger Words": 1, "Headline Formula Quality": 2,
  "Above-Fold Messaging": 3, "Social Proof Signals": 2,
};

export function getMarketingScore(results) {
  if (results.length === 0) return 0;
  let totalWeight = 0, weightedSum = 0;
  for (const r of results) {
    const w = MARKETING_WEIGHTS[r.label] || 1;
    weightedSum += r.score * w;
    totalWeight += w;
  }
  return Math.round(weightedSum / totalWeight);
}
