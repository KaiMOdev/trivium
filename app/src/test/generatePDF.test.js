// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { describe, it, expect } from "vitest";
import {
  buildExecutiveSummary,
  getReportScoreSet,
  getSecondaryPages,
} from "../utils/generatePDF";

describe("generatePDF helpers", () => {
  it("uses aggregate scores for site-wide report summaries", () => {
    const results = {
      scores: { seo: 20, llm: 30, marketing: 40, performance: 50 },
      seo: [],
      llm: [],
      marketing: [],
    };
    const siteResults = {
      pages: [{ url: "https://example.com/blog" }, { url: "https://example.com/" }],
      primaryUrl: "https://example.com/",
      aggregate: {
        scores: { seo: 80, llm: 70, marketing: 60, performance: 50 },
      },
    };

    expect(getReportScoreSet(results, siteResults)).toEqual(siteResults.aggregate.scores);
    expect(buildExecutiveSummary(results, siteResults, false)[0]).toContain("65 overall");
  });

  it("filters page-level issue pages by primaryUrl instead of position", () => {
    const results = {
      url: "https://example.com/",
      finalUrl: "https://example.com/",
    };
    const blogPage = { url: "https://example.com/blog" };
    const primaryPage = { url: "https://example.com/" };
    const pricingPage = { url: "https://example.com/pricing" };
    const siteResults = {
      pages: [blogPage, primaryPage, pricingPage],
      primaryUrl: "https://example.com/",
    };

    expect(getSecondaryPages(results, siteResults)).toEqual([blogPage, pricingPage]);
  });
});
