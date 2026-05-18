// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { memo, useState, useMemo } from "react";
import { theme } from "../../config/theme";
import ScoreRing from "../ScoreRing";

const PAGES_PER_GROUP = 25;

function groupByDirectory(pages) {
  const groups = {};
  for (const page of pages) {
    try {
      const url = new URL(page.url || page.finalUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      const dir = parts.length > 1 ? "/" + parts.slice(0, -1).join("/") + "/" : "/";
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(page);
    } catch {
      if (!groups["/"]) groups["/"] = [];
      groups["/"].push(page);
    }
  }
  return groups;
}

function getOverallScore(page) {
  const s = page.scores || {};
  const vals = [s.seo, s.llm, s.marketing, s.performance].filter((v) => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

export default memo(function PageList({ pages, onSelectPage }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score"); // "score" | "url" | "discovery"
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupPage, setGroupPage] = useState({}); // dir → page number

  const filtered = useMemo(() => {
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter((p) => (p.url || p.finalUrl || "").toLowerCase().includes(q));
  }, [pages, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "score") arr.sort((a, b) => getOverallScore(a) - getOverallScore(b));
    else if (sort === "url") arr.sort((a, b) => (a.url || "").localeCompare(b.url || ""));
    return arr;
  }, [filtered, sort]);

  const groups = useMemo(() => groupByDirectory(sorted), [sorted]);
  const groupKeys = Object.keys(groups).sort();

  const toggleGroup = (dir) => {
    setCollapsedGroups((prev) => ({ ...prev, [dir]: !prev[dir] }));
  };

  return (
    <div>
      {/* Search + sort */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Filter by URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 6,
            border: `1px solid ${theme.cardBorder}`, background: theme.card,
            color: theme.text, fontSize: "0.85rem", outline: "none",
          }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 6,
            border: `1px solid ${theme.cardBorder}`, background: theme.card,
            color: theme.text, fontSize: "0.85rem",
          }}
        >
          <option value="score">Sort: Worst score first</option>
          <option value="url">Sort: URL A-Z</option>
          <option value="discovery">Sort: Discovery order</option>
        </select>
      </div>

      {/* Page count */}
      <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginBottom: "1rem" }}>
        {filtered.length} page{filtered.length !== 1 ? "s" : ""} found
      </div>

      {/* Grouped pages */}
      {groupKeys.map((dir) => {
        const groupPages = groups[dir];
        const collapsed = collapsedGroups[dir];
        const currentPage = groupPage[dir] || 0;
        const start = currentPage * PAGES_PER_GROUP;
        const visible = groupPages.slice(start, start + PAGES_PER_GROUP);
        const totalGroupPages = Math.ceil(groupPages.length / PAGES_PER_GROUP);

        return (
          <div key={dir} style={{ marginBottom: "1rem" }}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(dir)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
                background: theme.card, border: `1px solid ${theme.cardBorder}`,
                borderRadius: 6, padding: "8px 12px", cursor: "pointer",
                color: theme.text, fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              <span style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              <span style={{ fontFamily: "'Fira Code', monospace" }}>{dir}</span>
              <span style={{ color: theme.textMuted, fontWeight: 400 }}>({groupPages.length})</span>
            </button>

            {/* Pages in group */}
            {!collapsed && (
              <div style={{ marginTop: "0.25rem" }}>
                {visible.map((page, i) => {
                  const score = getOverallScore(page);
                  const pageUrl = page.url || page.finalUrl || "";
                  const path = (() => { try { return new URL(pageUrl).pathname; } catch { return pageUrl; } })();

                  return (
                    <button
                      key={`${pageUrl}-${i}`}
                      onClick={() => onSelectPage(page)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem", width: "100%",
                        background: "transparent", border: "none", borderBottom: `1px solid ${theme.cardBorder}`,
                        padding: "10px 12px", cursor: "pointer", textAlign: "left",
                        minHeight: 48,
                      }}
                    >
                      <ScoreRing score={score} size={32} strokeWidth={2.5} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.85rem", color: theme.text, fontWeight: 500,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {page.meta?.title || path}
                        </div>
                        <div style={{
                          fontSize: "0.7rem", color: theme.textMuted, fontFamily: "'Fira Code', monospace",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {path}
                        </div>
                      </div>
                      {/* Mini score badges */}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {["seo", "llm", "marketing", "performance"].map((cat) => (
                          <span key={cat} style={{
                            fontSize: "0.65rem", fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                            background: (page.scores?.[cat] || 0) >= 75 ? "rgba(34,197,94,0.1)"
                              : (page.scores?.[cat] || 0) >= 45 ? "rgba(245,158,11,0.1)"
                              : "rgba(239,68,68,0.1)",
                            color: (page.scores?.[cat] || 0) >= 75 ? "#22c55e"
                              : (page.scores?.[cat] || 0) >= 45 ? "#f59e0b"
                              : "#ef4444",
                          }}>
                            {cat.toUpperCase()} {page.scores?.[cat] || 0}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}

                {/* Pagination within group */}
                {totalGroupPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", padding: "0.5rem" }}>
                    <button
                      onClick={() => setGroupPage((p) => ({ ...p, [dir]: Math.max(0, currentPage - 1) }))}
                      disabled={currentPage === 0}
                      style={{ background: "transparent", border: "none", color: theme.accent, cursor: "pointer", fontSize: "0.8rem", opacity: currentPage === 0 ? 0.3 : 1 }}
                    >
                      ← Prev
                    </button>
                    <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>
                      {currentPage + 1} / {totalGroupPages}
                    </span>
                    <button
                      onClick={() => setGroupPage((p) => ({ ...p, [dir]: Math.min(totalGroupPages - 1, currentPage + 1) }))}
                      disabled={currentPage >= totalGroupPages - 1}
                      style={{ background: "transparent", border: "none", color: theme.accent, cursor: "pointer", fontSize: "0.8rem", opacity: currentPage >= totalGroupPages - 1 ? 0.3 : 1 }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
