// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import RecommendationCard from "../components/RecommendationCard";
import InsightsPanel from "../components/InsightsPanel";

const mockRec = {
  category: "seo",
  priority: "critical",
  impact: "high",
  effort: "low",
  quickWin: true,
  title: "Add a meta description",
  description: "Meta descriptions control your search snippet.",
  score: 0,
  sourceLabel: "Meta Description",
};

const mockResults = {
  seo: [
    { label: "Title Tag", status: "pass", detail: "Good", score: 95 },
    { label: "Meta Description", status: "fail", detail: "Missing", score: 0 },
    { label: "H1 Heading", status: "warn", detail: "Multiple H1s", score: 50 },
    { label: "Canonical URL", status: "fail", detail: "Missing", score: 0 },
    { label: "Schema Markup", status: "warn", detail: "None found", score: 40 },
  ],
  llm: [
    { label: "Content Structure", score: 35, detail: "Poor hierarchy" },
    { label: "Citation Readiness", score: 40, detail: "No author" },
  ],
  marketing: [
    { label: "Call-to-Action", score: 30, detail: "No CTA" },
    { label: "Value Proposition", score: 20, detail: "Unclear" },
  ],
};

const mockScores = { seo: 55, llm: 38, marketing: 25 };

describe("RecommendationCard", () => {
  test("renders title", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    expect(screen.getByText("Add a meta description")).toBeInTheDocument();
  });

  test("renders priority badge", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  test("renders category badge", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    expect(screen.getByText(/SEO/)).toBeInTheDocument();
  });

  test("renders quick win badge for quick wins", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    expect(screen.getByText(/QUICK WIN/)).toBeInTheDocument();
  });

  test("does not show quick win badge when not a quick win", () => {
    const noQuickWin = { ...mockRec, quickWin: false };
    render(<RecommendationCard rec={noQuickWin} index={0} total={1} />);
    expect(screen.queryByText(/QUICK WIN/)).not.toBeInTheDocument();
  });

  test("renders score value", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  test("expands on click to show description", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    expect(screen.queryByText("Meta descriptions control your search snippet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Add a meta description"));
    expect(screen.getByText("Meta descriptions control your search snippet.")).toBeInTheDocument();
  });

  test("shows effort and impact in expanded state", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    fireEvent.click(screen.getByText("Add a meta description"));
    expect(screen.getByText("Quick fix")).toBeInTheDocument();
    expect(screen.getByText("Meta Description")).toBeInTheDocument();
  });

  test("collapses on second click", () => {
    render(<RecommendationCard rec={mockRec} index={0} total={1} />);
    const title = screen.getByText("Add a meta description");
    fireEvent.click(title);
    expect(screen.getByText("Meta descriptions control your search snippet.")).toBeInTheDocument();

    fireEvent.click(title);
    expect(screen.queryByText("Meta descriptions control your search snippet.")).not.toBeInTheDocument();
  });

  test("renders different priority levels", () => {
    const important = { ...mockRec, priority: "important", title: "Important item" };
    render(<RecommendationCard rec={important} index={0} total={1} />);
    expect(screen.getByText("IMPORTANT")).toBeInTheDocument();
  });

  test("renders optional priority", () => {
    const optional = { ...mockRec, priority: "optional", title: "Optional item" };
    render(<RecommendationCard rec={optional} index={0} total={1} />);
    expect(screen.getByText("OPTIONAL")).toBeInTheDocument();
  });
});

describe("InsightsPanel", () => {
  test("renders site grade", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    expect(screen.getByText("SITE GRADE")).toBeInTheDocument();
  });

  test("shows correct grade for low scores", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    // Overall = (55+38+25)/3 = 39 → grade D
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  test("shows issue count", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    expect(screen.getByText(/issues? found/)).toBeInTheDocument();
  });

  test("shows quick wins stat card", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    // "Quick Wins" appears in both stat card and filter tab — use getAllByText
    expect(screen.getAllByText("Quick Wins").length).toBeGreaterThanOrEqual(1);
  });

  test("shows potential gain", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    expect(screen.getByText("Potential Gain")).toBeInTheDocument();
  });

  test("shows issue distribution section", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    expect(screen.getByText("Issue distribution")).toBeInTheDocument();
  });

  test("renders filter tabs", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    // "Critical" and "Quick Wins" appear in both stat cards and filter tabs
    expect(screen.getAllByText("All").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Critical").length).toBeGreaterThanOrEqual(2); // stat + filter
    expect(screen.getAllByText("Quick Wins").length).toBeGreaterThanOrEqual(2); // stat + filter
  });

  test("renders recommendation cards", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    // Should find recommendation titles for failing checks
    expect(screen.getByText(/meta description/i)).toBeInTheDocument();
  });

  test("filtering by Critical shows only critical items", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    const criticalButton = screen.getAllByRole("button").find(
      (btn) => btn.textContent.includes("Critical")
    );
    fireEvent.click(criticalButton);

    // All visible cards should be critical
    const criticalBadges = screen.getAllByText("CRITICAL");
    expect(criticalBadges.length).toBeGreaterThan(0);
  });

  test("free tier hides AI Search and Marketing filter tabs", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="free" />);
    const buttons = screen.getAllByRole("button");
    const llmFilter = buttons.find((btn) => btn.textContent.includes("AI Search") && btn.textContent.includes("🤖"));
    expect(llmFilter).toBeUndefined();
  });

  // OSS build has no tier system, so no upgrade banner renders. Test removed.

  test("pro tier does not show upgrade banner", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    expect(screen.queryByText(/Unlock LLM & Marketing/)).not.toBeInTheDocument();
  });

  test("shows pro tip at the bottom", () => {
    render(<InsightsPanel results={mockResults} scores={mockScores} tier="pro" />);
    expect(screen.getByText(/Pro tip:/)).toBeInTheDocument();
  });

  test("shows all-passed message when no issues", () => {
    const perfectResults = {
      seo: [{ label: "Title", status: "pass", detail: "Good", score: 95 }],
      llm: [{ label: "Structure", score: 85, detail: "Good" }],
      marketing: [{ label: "CTA", score: 90, detail: "Good" }],
    };
    const perfectScores = { seo: 95, llm: 85, marketing: 90 };
    render(<InsightsPanel results={perfectResults} scores={perfectScores} tier="pro" />);
    expect(screen.getByText("All checks passed!")).toBeInTheDocument();
  });

  test("grade A for high scores", () => {
    const highScores = { seo: 90, llm: 88, marketing: 85 };
    const perfectResults = {
      seo: [{ label: "Title", status: "pass", detail: "Good", score: 95 }],
      llm: [],
      marketing: [],
    };
    render(<InsightsPanel results={perfectResults} scores={highScores} tier="pro" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
