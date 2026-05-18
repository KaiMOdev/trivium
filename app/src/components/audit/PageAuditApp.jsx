// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useCallback } from "react";
import { theme } from "../../config/theme";
import { TIER_FEATURES, tierAtLeast } from "../../config/tiers";
import usePageAudit from "../../hooks/usePageAudit";
import PageList from "./PageList";
import PageDetail from "./PageDetail";
import ScoreRing from "../ScoreRing";
import UpgradeBanner from "../UpgradeBanner";
import SectionHeader from "../SectionHeader";

export default function PageAuditApp({ userTier, token, onUpgrade, initialUrl }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [showFilters, setShowFilters] = useState(false);
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const {
    discovering, pages, progress, selectedPage, setSelectedPage,
    error, aggregate, primaryResult, primaryUrl, startDiscover, stopDiscover, requestFix, reset,
  } = usePageAudit();

  const [viewedPages, setViewedPages] = useState(new Set());
  const detailPagesLimit = TIER_FEATURES[userTier]?.auditDetailPages ?? 3;

  const parsePatterns = (input) =>
    input.split(",").map(s => s.trim()).filter(s => s.length > 0 && s.startsWith("/"));

  const handleStart = useCallback(() => {
    if (!url.trim()) return;
    const maxDepth = TIER_FEATURES[userTier]?.auditDepth ?? 2;
    const includePaths = parsePatterns(includeInput);
    const excludePaths = parsePatterns(excludeInput);
    startDiscover(
      url.trim(), token,
      maxDepth === -1 ? undefined : maxDepth,
      { includePaths, excludePaths }
    );
  }, [url, userTier, token, startDiscover, includeInput, excludeInput]);

  const handleSelectPage = useCallback((page) => {
    const pageUrl = page.url || page.finalUrl;
    const alreadyViewed = viewedPages.has(pageUrl);
    if (!alreadyViewed && detailPagesLimit !== -1 && viewedPages.size >= detailPagesLimit) {
      return; // will show upgrade banner
    }
    setSelectedPage(page);
    if (!alreadyViewed) {
      setViewedPages((prev) => new Set(prev).add(pageUrl));
    }
  }, [detailPagesLimit, viewedPages, setSelectedPage]);

  const handleRequestFix = useCallback(async (pageUrl, checks, pageContext) => {
    return await requestFix(pageUrl, checks, pageContext, token);
  }, [requestFix, token]);

  const handleNewAudit = useCallback(() => {
    reset();
    setUrl("");
    setIncludeInput("");
    setExcludeInput("");
    setShowFilters(false);
    setViewedPages(new Set());
  }, [reset]);

  // Detail view
  if (selectedPage) {
    return (
      <div>
        <PageDetail
          page={selectedPage}
          onBack={() => setSelectedPage(null)}
          onRequestFix={handleRequestFix}
          userTier={userTier}
          onUpgrade={onUpgrade}
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Page Audit"
        subtitle="Discover pages, find issues, get actionable fixes"
      />

      {/* URL input + filters */}
      {pages.length === 0 && !discovering && (
        <div style={{ marginBottom: "1.5rem", maxWidth: 600 }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              style={{
                flex: 1, minWidth: 250, padding: "10px 14px", borderRadius: 8,
                border: `1px solid ${theme.cardBorder}`, background: theme.card,
                color: theme.text, fontSize: "0.9rem", outline: "none",
                fontFamily: "'Fira Code', monospace",
              }}
            />
            <button
              onClick={handleStart}
              disabled={!url.trim()}
              style={{
                background: theme.accent, color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 24px", fontSize: "0.9rem",
                fontWeight: 600, cursor: "pointer",
                opacity: url.trim() ? 1 : 0.5,
              }}
            >
              Start Audit
            </button>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: "none", border: "none", color: theme.textMuted,
              fontSize: "0.75rem", cursor: "pointer", padding: "6px 0",
              marginTop: "0.5rem",
            }}
          >
            {showFilters ? "- Hide filters" : "+ Filter by path"}
          </button>

          {/* Collapsible filter inputs */}
          {showFilters && (
            <div style={{
              marginTop: "0.5rem", padding: "12px 14px",
              background: theme.surface, borderRadius: 8,
              border: `1px solid ${theme.cardBorder}`,
              display: "flex", flexDirection: "column", gap: "0.5rem",
            }}>
              <label style={{ fontSize: "0.75rem", color: theme.textMuted }}>
                Include paths
                <input
                  type="text"
                  placeholder="/blog/*, /products/*"
                  value={includeInput}
                  onChange={(e) => setIncludeInput(e.target.value)}
                  style={{
                    display: "block", width: "100%", marginTop: 4,
                    padding: "8px 10px", borderRadius: 6,
                    border: `1px solid ${theme.cardBorder}`, background: theme.card,
                    color: theme.text, fontSize: "0.8rem", outline: "none",
                    fontFamily: "'Fira Code', monospace",
                  }}
                />
              </label>
              <label style={{ fontSize: "0.75rem", color: theme.textMuted }}>
                Exclude paths
                <input
                  type="text"
                  placeholder="/legal/*, /tag/*"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  style={{
                    display: "block", width: "100%", marginTop: 4,
                    padding: "8px 10px", borderRadius: 6,
                    border: `1px solid ${theme.cardBorder}`, background: theme.card,
                    color: theme.text, fontSize: "0.8rem", outline: "none",
                    fontFamily: "'Fira Code', monospace",
                  }}
                />
              </label>
              <span style={{ fontSize: "0.7rem", color: theme.textDim }}>
                Comma-separated path patterns. Use * as wildcard. Exclude overrides include.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar during discovery */}
      {discovering && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: theme.text }}>
              Scanning... {progress.completed} of {progress.total || "?"} pages
            </span>
            <button
              onClick={stopDiscover}
              style={{
                background: "transparent", border: `1px solid ${theme.cardBorder}`,
                color: theme.textMuted, borderRadius: 6, padding: "4px 12px",
                fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              Stop
            </button>
          </div>
          <div style={{
            height: 4, background: theme.cardBorder, borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", background: theme.accent, borderRadius: 2,
              width: progress.total ? `${(progress.completed / progress.total) * 100}%` : "10%",
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "0.75rem", background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
          color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem",
        }}>
          {error}
        </div>
      )}

      {/* Aggregate scores */}
      {aggregate && !discovering && (
        <div style={{
          display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap",
          alignItems: "center",
        }}>
          {["seo", "llm", "marketing", "performance"].map((cat) => (
            <div key={cat} style={{ textAlign: "center" }}>
              <ScoreRing score={aggregate.scores?.[cat] || 0} size={56} strokeWidth={4} />
              <div style={{ fontSize: "0.7rem", color: theme.textMuted, marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>
                {cat}
              </div>
            </div>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={handleNewAudit}
              style={{
                background: "transparent", border: `1px solid ${theme.cardBorder}`,
                color: theme.textMuted, borderRadius: 6, padding: "6px 14px",
                fontSize: "0.8rem", cursor: "pointer",
              }}
            >
              New Audit
            </button>
          </div>
        </div>
      )}

      {/* PDF Export bar */}
      {aggregate && !discovering && tierAtLeast(userTier, "pro") && (
        <div style={{
          marginBottom: "1rem", padding: "12px 18px",
          background: theme.surface, borderRadius: 10,
          border: `1px solid ${theme.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ color: theme.textMuted, fontSize: "0.8rem" }}>
            Export audit report as PDF
          </span>
          <button
            onClick={() => {
              // Build commonIssues from page data
              const issueCounts = {};
              for (const p of pages) {
                for (const cat of ["seo", "llm", "marketing"]) {
                  for (const check of (p[cat] || [])) {
                    if (check.score == null || check.status === "na") continue;
                    const score = check.score;
                    if (score < 75) {
                      if (!issueCounts[check.label]) {
                        issueCounts[check.label] = { label: check.label, totalScore: 0, count: 0 };
                      }
                      issueCounts[check.label].totalScore += score;
                      issueCounts[check.label].count += 1;
                    }
                  }
                }
              }
              const commonIssues = Object.values(issueCounts)
                .map(i => ({ ...i, avgScore: Math.round(i.totalScore / i.count) }))
                .sort((a, b) => a.avgScore - b.avgScore)
                .slice(0, 15);

              const primary = primaryResult || pages[0] || {};
              const siteResults = {
                pages,
                primaryUrl: primaryUrl || primary.finalUrl || primary.url || url,
                aggregate: {
                  ...aggregate,
                  pagesScanned: pages.length,
                  pagesFailed: pages.filter(p => p.scanError).length,
                  commonIssues,
                },
              };
              import("../../utils/generatePDF").then(m =>
                m.default(primary, userTier, url, siteResults, null)
              );
            }}
            style={{
              background: theme.accent, color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 18px", fontSize: "0.8rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            ◧ PDF
          </button>
        </div>
      )}

      {/* Free tier upgrade banner when detail limit reached */}
      {detailPagesLimit !== -1 && viewedPages.size >= detailPagesLimit && (
        <div style={{ marginBottom: "1rem" }}>
          <UpgradeBanner
            requiredTier="pro"
            featureDesc={`Free plan allows detailed checks for ${detailPagesLimit} pages. Upgrade to Pro for unlimited page details and AI-powered fix suggestions.`}
            compact
            onUpgrade={onUpgrade}
          />
        </div>
      )}

      {/* Page list */}
      {pages.length > 0 && (
        <PageList
          pages={pages}
          onSelectPage={handleSelectPage}
        />
      )}
    </div>
  );
}
