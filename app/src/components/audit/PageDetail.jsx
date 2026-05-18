// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { memo, useState, useCallback } from "react";
import { theme } from "../../config/theme";
import ScoreRing from "../ScoreRing";
import StatusBadge from "../StatusBadge";
import TodoCard from "./TodoCard";
import { getStatus } from "../../utils/status";
import { tierAtLeast } from "../../config/tiers";

const CATEGORY_COLORS = {
  seo: theme.accent,
  llm: theme.info,
  marketing: theme.warning,
};

const CATEGORY_LABELS = {
  seo: "SEO",
  llm: "GEO",
  marketing: "MARKETING",
};

export default memo(function PageDetail({ page, onBack, onRequestFix, userTier, onUpgrade }) {
  const [todos, setTodos] = useState({}); // keyed by "category:label"
  const [loading, setLoading] = useState({}); // keyed by "category:label"
  const [naExpanded, setNaExpanded] = useState(false);

  const canUseFix = tierAtLeast(userTier, "pro");

  // Collect all checks, grouped by severity
  const allChecks = [];
  for (const cat of ["seo", "llm", "marketing"]) {
    if (page[cat]) {
      for (const check of page[cat]) {
        allChecks.push({ ...check, category: cat });
      }
    }
  }

  const fails = allChecks.filter((c) => getStatus(c) === "fail");
  const warns = allChecks.filter((c) => getStatus(c) === "warn");
  const passes = allChecks.filter((c) => getStatus(c) === "pass");
  const nas = allChecks.filter((c) => getStatus(c) === "na");

  // Build page context for AI — include meta info as structured text since raw HTML isn't in scan results
  const buildPageContext = useCallback(() => {
    const meta = page.meta || {};
    const parts = [`<title>${meta.title || ""}</title>`];
    if (meta.description) parts.push(`<meta name="description" content="${meta.description}">`);
    const snippet = parts.join("\n");
    return { platform: page.platform, title: meta.title, html_snippet: snippet };
  }, [page]);

  const handleGetTodo = useCallback(async (check) => {
    const key = `${check.category}:${check.label}`;
    setLoading((prev) => ({ ...prev, [key]: true }));

    const result = await onRequestFix(
      page.url || page.finalUrl,
      [{ category: check.category, label: check.label, score: check.score, detail: check.detail }],
      buildPageContext()
    );

    setLoading((prev) => ({ ...prev, [key]: false }));
    if (result?.todos?.[0]) {
      setTodos((prev) => ({ ...prev, [key]: result.todos[0] }));
    }
  }, [page, onRequestFix, buildPageContext]);


  const renderCheck = (check) => {
    const key = `${check.category}:${check.label}`;
    const status = getStatus(check);
    return (
      <div key={key} style={{ marginBottom: "0.5rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem",
          background: theme.card, borderRadius: 8, border: `1px solid ${theme.cardBorder}`,
        }}>
          {/* Category badge */}
          <span style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "1px 6px",
            borderRadius: 3,
            background: (CATEGORY_COLORS[check.category] || theme.textMuted) + "15",
            color: CATEGORY_COLORS[check.category] || theme.textMuted,
            border: `1px solid ${(CATEGORY_COLORS[check.category] || theme.textMuted)}30`,
            flexShrink: 0,
          }}>
            {CATEGORY_LABELS[check.category] || check.category?.toUpperCase()}
          </span>
          <ScoreRing score={check.score} size={36} strokeWidth={3} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: theme.text }}>{check.label}</div>
            <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>{check.detail}</div>
          </div>
          <StatusBadge status={status} />
          {status !== "pass" && status !== "na" && !todos[key] && (
            <button
              onClick={() => canUseFix ? handleGetTodo(check) : onUpgrade?.()}
              disabled={loading[key]}
              style={{
                background: canUseFix ? theme.accent : theme.cardBorder,
                color: "#fff", border: "none", borderRadius: 6,
                padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                opacity: loading[key] ? 0.5 : 1,
              }}
            >
              {loading[key] ? "..." : "Get TODO"}
            </button>
          )}
        </div>
        {loading[key] && <TodoCard loading />}
        {todos[key] && <TodoCard todo={todos[key]} />}
      </div>
    );
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: "transparent", border: "none", color: theme.accent,
          cursor: "pointer", fontSize: "0.85rem", marginBottom: "1rem", padding: 0,
        }}
      >
        ← Back to page list
      </button>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem",
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", color: theme.text, margin: 0, fontSize: "1.2rem" }}>
            {page.meta?.title || page.url}
          </h2>
          <a
            href={page.url || page.finalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.75rem", color: theme.textMuted, wordBreak: "break-all" }}
          >
            {page.url || page.finalUrl}
          </a>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {["seo", "llm", "marketing", "performance"].map((cat) => (
            <div key={cat} style={{ textAlign: "center" }}>
              <ScoreRing score={page.scores?.[cat] || 0} size={48} strokeWidth={3} />
              <div style={{ fontSize: "0.65rem", color: theme.textMuted, marginTop: 2, textTransform: "uppercase" }}>
                {cat}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Check groups */}
      {fails.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", color: "#ef4444", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Fails ({fails.length})
          </h3>
          {fails.map(renderCheck)}
        </div>
      )}

      {warns.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", color: "#f59e0b", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Warnings ({warns.length})
          </h3>
          {warns.map(renderCheck)}
        </div>
      )}

      {passes.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", color: "#22c55e", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Passing ({passes.length})
          </h3>
          {passes.map(renderCheck)}
        </div>
      )}

      {nas.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={() => setNaExpanded(!naExpanded)}
            style={{
              background: "transparent", border: "none", color: theme.textMuted,
              cursor: "pointer", fontSize: "0.85rem", fontFamily: "'Syne', sans-serif",
              padding: 0, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ transform: naExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
            Not Applicable ({nas.length})
          </button>
          {naExpanded && nas.map(renderCheck)}
        </div>
      )}
    </div>
  );
});
