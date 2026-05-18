// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useMemo, useEffect } from "react";
import { theme } from "../config/theme";
import ScoreRing from "./ScoreRing";

const CATEGORIES = [
  { key: "seo", label: "SEO", color: theme.accent },
  { key: "llm", label: "AI Search", color: theme.info },
  { key: "marketing", label: "Marketing", color: theme.warning },
  { key: "performance", label: "Speed", color: theme.violet },
];

const TIME_RANGES = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: Infinity },
];

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Compute trend direction and delta */
function computeTrend(entries, key) {
  if (entries.length < 2) return { delta: 0, direction: "stable" };
  const latest = entries[entries.length - 1].scores[key] || 0;
  const previous = entries[entries.length - 2].scores[key] || 0;
  const delta = latest - previous;
  return {
    delta,
    direction: delta > 2 ? "up" : delta < -2 ? "down" : "stable",
  };
}

/** Detect regressions (score drops > 5 points) */
function detectRegressions(entries) {
  if (entries.length < 2) return [];
  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const regressions = [];

  for (const cat of CATEGORIES) {
    const curr = latest.scores[cat.key] || 0;
    const prev = previous.scores[cat.key] || 0;
    if (prev - curr >= 5) {
      regressions.push({
        category: cat.label,
        color: cat.color,
        from: prev,
        to: curr,
        drop: prev - curr,
      });
    }
  }
  return regressions;
}

/** SVG multi-line trend chart */
function TrendChart({ entries, visibleCategories, height = 220 }) {
  if (entries.length === 0) return null;

  const padding = { top: 20, right: 16, bottom: 36, left: 40 };
  const width = 600;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // X positions — evenly spaced
  const xStep = entries.length > 1 ? chartW / (entries.length - 1) : chartW / 2;
  const getX = (i) => padding.left + i * xStep;

  // Y scale — 0 to 100
  const getY = (score) => padding.top + chartH - (score / 100) * chartH;

  // Horizontal grid lines
  const gridLines = [0, 25, 50, 75, 100];

  // Build paths per category
  const paths = visibleCategories.map((cat) => {
    const points = entries.map((e, i) => ({
      x: getX(i),
      y: getY(e.scores[cat.key] || 0),
      score: e.scores[cat.key] || 0,
    }));

    // Smooth curve using cubic bezier
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Area fill path
    const areaD = d + ` L ${points[points.length - 1].x} ${getY(0)} L ${points[0].x} ${getY(0)} Z`;

    return { cat, points, d, areaD };
  });

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible", display: "block" }}
    >
      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={padding.left} y1={getY(v)}
            x2={width - padding.right} y2={getY(v)}
            stroke={theme.cardBorder}
            strokeWidth={v === 0 ? 1.2 : 0.6}
            strokeDasharray={v === 0 ? "none" : "4 4"}
            opacity={0.5}
          />
          <text
            x={padding.left - 8} y={getY(v) + 3}
            textAnchor="end" fill={theme.textDim}
            fontSize={9} fontFamily={theme.fontMono}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Date labels */}
      {entries.map((e, i) => {
        // Only show labels at reasonable intervals
        const showLabel =
          entries.length <= 8 ||
          i === 0 ||
          i === entries.length - 1 ||
          i % Math.ceil(entries.length / 6) === 0;
        if (!showLabel) return null;
        return (
          <text
            key={i}
            x={getX(i)} y={height - 4}
            textAnchor="middle" fill={theme.textDim}
            fontSize={9} fontFamily={theme.fontMono}
          >
            {formatDate(e.date)}
          </text>
        );
      })}

      {/* Area fills */}
      {paths.map(({ cat, areaD }) => (
        <path
          key={`area-${cat.key}`}
          d={areaD}
          fill={cat.color}
          fillOpacity={0.04}
        />
      ))}

      {/* Lines */}
      {paths.map(({ cat, d }) => (
        <path
          key={`line-${cat.key}`}
          d={d}
          fill="none"
          stroke={cat.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 6px ${cat.color}40)`,
            transition: "d 0.6s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      ))}

      {/* Data points */}
      {paths.map(({ cat, points }) =>
        points.map((p, i) => (
          <g key={`dot-${cat.key}-${i}`}>
            {/* Glow */}
            <circle
              cx={p.x} cy={p.y} r={6}
              fill={cat.color} opacity={0.15}
            />
            {/* Dot */}
            <circle
              cx={p.x} cy={p.y} r={3.5}
              fill={cat.color}
              stroke={theme.bg} strokeWidth={1.5}
              style={{ transition: "all 0.3s" }}
            />
            {/* Score tooltip on last point */}
            {i === points.length - 1 && (
              <text
                x={p.x + 8} y={p.y + 4}
                fill={cat.color} fontSize={11}
                fontFamily={theme.fontMono} fontWeight={700}
              >
                {p.score}
              </text>
            )}
          </g>
        ))
      )}
    </svg>
  );
}

/** Trend arrow indicator */
function TrendArrow({ direction, delta }) {
  const config = {
    up: { symbol: "▲", color: theme.accent, label: `+${delta}` },
    down: { symbol: "▼", color: theme.danger, label: `${delta}` },
    stable: { symbol: "—", color: theme.textDim, label: "±0" },
  };
  const c = config[direction];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 11, fontWeight: 700, fontFamily: theme.fontMono,
      color: c.color,
    }}>
      <span style={{ fontSize: 8 }}>{c.symbol}</span>
      {c.label}
    </span>
  );
}

/** Domain selector dropdown for history */
function DomainPicker({ domains, selected, onSelect }) {
  if (domains.length <= 1) return null;
  return (
    <div style={{
      display: "flex", gap: 6, flexWrap: "wrap",
    }}>
      {domains.map((d) => (
        <button key={d.domain} onClick={() => onSelect(d.domain)}
          style={{
            padding: "6px 14px", borderRadius: 8,
            border: `1px solid ${selected === d.domain ? theme.accent + "40" : theme.cardBorder}`,
            background: selected === d.domain ? theme.accentGlow : theme.surface,
            color: selected === d.domain ? theme.accent : theme.textMuted,
            fontSize: 12, fontFamily: theme.fontMono,
            cursor: "pointer", transition: "all 0.2s",
            fontWeight: selected === d.domain ? 600 : 400,
          }}>
          {d.domain}
          <span style={{
            marginLeft: 6, fontSize: 9, opacity: 0.6,
          }}>({d.scanCount})</span>
        </button>
      ))}
    </div>
  );
}

export default function TrendsPanel({ scanHistory, currentUrl, token }) {
  const [serverHistory, setServerHistory] = useState([]);

  // Fetch server-side scan history (has full time range)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "/api";
        // Fetch up to 200 scans for trends (paginated)
        const res = await fetch(`${apiBase}/scans/history?limit=50&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        // Fetch remaining pages if any
        const allScans = [...(data.scans || [])];
        const totalPages = data.totalPages || 1;
        for (let p = 2; p <= Math.min(totalPages, 4); p++) {
          const r = await fetch(`${apiBase}/scans/history?limit=50&page=${p}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) {
            const d = await r.json();
            allScans.push(...(d.scans || []));
          }
        }
        if (!cancelled) setServerHistory(allScans);
      } catch { /* ignore — fall back to localStorage */ }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Merge server history with localStorage, deduplicate by timestamp+url
  const mergedHistory = useMemo(() => {
    const byDomain = {};

    // Add localStorage entries
    for (const [domain, entries] of Object.entries(scanHistory.history)) {
      byDomain[domain] = [...(entries || [])];
    }

    // Add server entries (with per-category scores)
    for (const scan of serverHistory) {
      if (!scan.scores) continue; // skip entries without category breakdown
      const domain = getDomain(scan.url);
      if (!byDomain[domain]) byDomain[domain] = [];
      const ts = new Date(scan.created_at).getTime();
      // Deduplicate: skip if a localStorage entry exists within 60s
      const isDuplicate = byDomain[domain].some(
        (e) => Math.abs(e.timestamp - ts) < 60000
      );
      if (!isDuplicate) {
        byDomain[domain].push({
          timestamp: ts,
          date: scan.created_at,
          url: scan.url,
          scores: scan.scores,
        });
      }
    }

    return byDomain;
  }, [scanHistory.history, serverHistory]);

  const domains = useMemo(() => {
    return Object.keys(mergedHistory).map((domain) => {
      const entries = mergedHistory[domain];
      const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
      const latest = sorted[sorted.length - 1];
      return {
        domain,
        scanCount: entries.length,
        lastScanned: latest?.date,
        latestScores: latest?.scores,
      };
    });
  }, [mergedHistory]);

  const defaultDomain = currentUrl ? getDomain(currentUrl) : (domains[0]?.domain || "");
  const [selectedDomain, setSelectedDomain] = useState(defaultDomain);

  useEffect(() => {
    if (currentUrl) setSelectedDomain(getDomain(currentUrl));
  }, [currentUrl]);
  const [timeRange, setTimeRange] = useState("all");
  const [visibleCats, setVisibleCats] = useState(
    CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: true }), {})
  );

  const allEntries = useMemo(() => {
    const domainEntries = mergedHistory[selectedDomain] || [];
    return [...domainEntries].sort((a, b) => a.timestamp - b.timestamp);
  }, [mergedHistory, selectedDomain]);

  // Filter by time range
  const entries = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.id === timeRange);
    if (!range || range.days === Infinity) return allEntries;
    const cutoff = Date.now() - range.days * 86400000;
    return allEntries.filter((e) => e.timestamp >= cutoff);
  }, [allEntries, timeRange]);

  const visibleCategories = CATEGORIES.filter((c) => visibleCats[c.key]);

  // Trend calculations
  const trends = useMemo(() =>
    CATEGORIES.reduce((acc, cat) => {
      acc[cat.key] = computeTrend(entries, cat.key);
      return acc;
    }, {}),
    [entries]
  );

  const regressions = useMemo(() => detectRegressions(entries), [entries]);

  // Overall score progression
  const latestScores = entries.length > 0 ? entries[entries.length - 1].scores : null;
  const firstScores = entries.length > 0 ? entries[0].scores : null;

  const overallLatest = latestScores
    ? Math.round(CATEGORIES.reduce((s, c) => s + (latestScores[c.key] || 0), 0) / CATEGORIES.length)
    : 0;
  const overallFirst = firstScores
    ? Math.round(CATEGORIES.reduce((s, c) => s + (firstScores[c.key] || 0), 0) / CATEGORIES.length)
    : 0;
  const overallDelta = overallLatest - overallFirst;

  // Empty state
  if (domains.length === 0) {
    return (
      <div style={{
        background: theme.card, borderRadius: 16,
        border: `1px solid ${theme.cardBorder}`,
        padding: "60px 24px", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, rgba(0,245,212,0.12), rgba(167,119,255,0.12))",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, marginBottom: 18,
        }}>📈</div>
        <div style={{
          fontFamily: theme.fontDisplay, fontSize: 18, fontWeight: 700,
          marginBottom: 8, letterSpacing: "-0.02em",
        }}>No History Yet</div>
        <div style={{
          color: theme.textMuted, fontSize: 13, maxWidth: 420, margin: "0 auto",
          lineHeight: 1.7,
        }}>
          Run your first scan to start tracking trends. Every scan is automatically saved,
          building a history of how your site&apos;s scores evolve over time.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: theme.card, borderRadius: 16,
      border: `1px solid ${theme.cardBorder}`,
      padding: 28, position: "relative", overflow: "hidden",
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -80, left: -60,
        width: 240, height: 240, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,245,212,0.03) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -60, right: -40,
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(167,119,255,0.03) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(0,245,212,0.12), rgba(167,119,255,0.12))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15,
          }}>📈</div>
          <div>
            <h3 style={{
              fontFamily: theme.fontDisplay, fontSize: 18, fontWeight: 700,
              letterSpacing: "-0.02em", margin: 0,
            }}>Score Trends</h3>
            <p style={{ color: theme.textMuted, fontSize: 12, margin: "3px 0 0" }}>
              {entries.length} scan{entries.length !== 1 ? "s" : ""} tracked
              {entries.length > 0 && ` · since ${formatDate(entries[0].date)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Domain picker */}
      {domains.length > 1 && (
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <DomainPicker domains={domains} selected={selectedDomain} onSelect={setSelectedDomain} />
        </div>
      )}

      {/* Time range + category toggles */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 18, marginBottom: 20, flexWrap: "wrap", gap: 10,
      }}>
        {/* Time range */}
        <div style={{
          display: "flex", gap: 2, padding: 3,
          background: theme.surface, borderRadius: 8,
          border: `1px solid ${theme.cardBorder}`,
        }}>
          {TIME_RANGES.map((r) => (
            <button key={r.id} onClick={() => setTimeRange(r.id)}
              style={{
                padding: "5px 12px", borderRadius: 6,
                border: "none",
                background: timeRange === r.id ? theme.card : "transparent",
                color: timeRange === r.id ? theme.text : theme.textDim,
                fontSize: 11, fontFamily: theme.fontMono,
                cursor: "pointer", transition: "all 0.2s",
                fontWeight: timeRange === r.id ? 600 : 400,
                boxShadow: timeRange === r.id ? `0 1px 4px rgba(0,0,0,0.3)` : "none",
              }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Category toggles */}
        <div style={{ display: "flex", gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.key}
              onClick={() => setVisibleCats((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
              style={{
                padding: "5px 10px", borderRadius: 6,
                border: `1px solid ${visibleCats[cat.key] ? cat.color + "40" : theme.cardBorder}`,
                background: visibleCats[cat.key] ? cat.color + "10" : "transparent",
                color: visibleCats[cat.key] ? cat.color : theme.textDim,
                fontSize: 10, fontFamily: theme.fontMono, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
                letterSpacing: "0.03em",
              }}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Regression alerts */}
      {regressions.length > 0 && (
        <div style={{
          marginBottom: 20, padding: "14px 18px", borderRadius: 12,
          background: theme.dangerGlow,
          border: `1px solid rgba(255,77,106,0.18)`,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: theme.danger,
            fontFamily: theme.fontDisplay, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <span style={{ fontSize: 14 }}>⚠</span>
            Score Regression Detected
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {regressions.map((r, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, color: theme.text,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: r.color, flexShrink: 0,
                }} />
                <span style={{ fontFamily: theme.fontMono }}>
                  {r.category}: {r.from} → {r.to}
                </span>
                <span style={{
                  color: theme.danger, fontWeight: 700,
                  fontFamily: theme.fontMono, fontSize: 11,
                }}>
                  −{r.drop}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score summary cards */}
      {latestScores && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10, marginBottom: 24,
        }}>
          {/* Overall */}
          <div style={{
            padding: "18px 14px", borderRadius: 14, textAlign: "center",
            background: `linear-gradient(135deg, ${theme.accentGlow}, ${theme.violetGlow})`,
            border: `1px solid rgba(0,245,212,0.15)`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -20, right: -20,
              width: 60, height: 60, borderRadius: "50%",
              background: `radial-gradient(circle, ${theme.accent}08, transparent 70%)`,
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <ScoreRing score={overallLatest} size={52} strokeWidth={4} />
            </div>
            <div style={{
              fontSize: 10, fontFamily: theme.fontMono, color: theme.textDim,
              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4,
            }}>OVERALL</div>
            {entries.length > 1 && (
              <TrendArrow direction={overallDelta > 2 ? "up" : overallDelta < -2 ? "down" : "stable"} delta={overallDelta} />
            )}
          </div>

          {/* Category scores */}
          {CATEGORIES.map((cat) => {
            const score = latestScores[cat.key] || 0;
            const trend = trends[cat.key];
            return (
              <div key={cat.key} style={{
                padding: "18px 14px", borderRadius: 14, textAlign: "center",
                background: theme.surface,
                border: `1px solid ${theme.cardBorder}`,
                transition: "all 0.3s",
              }}>
                <div style={{
                  fontSize: 28, fontWeight: 800, fontFamily: theme.fontDisplay,
                  color: cat.color, lineHeight: 1,
                  filter: `drop-shadow(0 0 8px ${cat.color}30)`,
                  marginBottom: 8,
                }}>{score}</div>
                <div style={{
                  fontSize: 10, fontFamily: theme.fontMono, color: theme.textDim,
                  letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4,
                }}>{cat.label}</div>
                {entries.length > 1 && (
                  <TrendArrow direction={trend.direction} delta={trend.delta} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {entries.length >= 2 ? (
        <div style={{
          background: theme.surface, borderRadius: 14,
          border: `1px solid ${theme.cardBorder}`,
          padding: "20px 16px 8px",
        }}>
          <TrendChart entries={entries} visibleCategories={visibleCategories} />
        </div>
      ) : entries.length === 1 ? (
        <div style={{
          background: theme.surface, borderRadius: 14,
          border: `1px solid ${theme.cardBorder}`,
          padding: "40px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.7 }}>
            <span style={{ fontSize: 20, display: "block", marginBottom: 10 }}>📊</span>
            One scan recorded. Run another scan to start seeing trend lines.
          </div>
        </div>
      ) : null}

      {/* Scan history table */}
      {entries.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, fontFamily: theme.fontDisplay,
            letterSpacing: "-0.01em", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 6,
              background: theme.accentGlow,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: theme.accent,
            }}>≡</span>
            Scan History
          </div>

          <div style={{
            background: theme.surface, borderRadius: 12,
            border: `1px solid ${theme.cardBorder}`,
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.4fr repeat(4, 1fr) 0.8fr",
              padding: "10px 16px",
              borderBottom: `1px solid ${theme.cardBorder}`,
              fontSize: 10, fontFamily: theme.fontMono,
              color: theme.textDim, letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              <span>Date</span>
              {CATEGORIES.map((c) => (
                <span key={c.key} style={{ textAlign: "center" }}>{c.label}</span>
              ))}
              <span style={{ textAlign: "center" }}>Avg</span>
            </div>

            {/* Table rows — most recent first */}
            {[...entries].reverse().slice(0, 15).map((entry, i) => {
              const avg = Math.round(
                CATEGORIES.reduce((s, c) => s + (entry.scores[c.key] || 0), 0) / CATEGORIES.length
              );
              return (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr repeat(4, 1fr) 0.8fr",
                  padding: "10px 16px",
                  borderBottom: i < Math.min(entries.length, 15) - 1 ? `1px solid ${theme.cardBorder}` : "none",
                  fontSize: 12, fontFamily: theme.fontMono,
                  transition: "background 0.15s",
                  cursor: "default",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: theme.textMuted, fontSize: 11 }}>
                    {formatDateFull(entry.date)}
                  </span>
                  {CATEGORIES.map((c) => {
                    const score = entry.scores[c.key] || 0;
                    const color = score >= 75 ? theme.accent : score >= 45 ? theme.warning : theme.danger;
                    return (
                      <span key={c.key} style={{
                        textAlign: "center", fontWeight: 600,
                        color,
                      }}>{score}</span>
                    );
                  })}
                  <span style={{
                    textAlign: "center", fontWeight: 700,
                    color: avg >= 75 ? theme.accent : avg >= 45 ? theme.warning : theme.danger,
                  }}>{avg}</span>
                </div>
              );
            })}
          </div>

          {entries.length > 15 && (
            <div style={{
              textAlign: "center", padding: "10px 0",
              fontSize: 11, color: theme.textDim, fontFamily: theme.fontMono,
            }}>
              Showing 15 of {entries.length} scans
            </div>
          )}
        </div>
      )}

      {/* Best / worst indicators */}
      {entries.length >= 3 && latestScores && (
        <div style={{
          marginTop: 20, padding: "16px 22px",
          background: theme.surface, borderRadius: 14,
          border: `1px solid ${theme.cardBorder}`,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: theme.accentGlow,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>💡</div>
          <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.7 }}>
            <strong style={{ color: theme.text }}>Trend insight:</strong>{" "}
            {(() => {
              const bestCat = CATEGORIES.reduce((best, cat) =>
                (trends[cat.key].delta > trends[best.key].delta) ? cat : best
              );
              const worstCat = CATEGORIES.reduce((worst, cat) =>
                (trends[cat.key].delta < trends[worst.key].delta) ? cat : worst
              );

              if (overallDelta > 5) {
                return <>Your overall score improved by <strong style={{ color: theme.accent }}>+{overallDelta} points</strong> since your first scan. Keep it up!</>;
              } else if (overallDelta < -5) {
                return <>Your overall score dropped by <strong style={{ color: theme.danger }}>{overallDelta} points</strong>. Focus on <strong style={{ color: worstCat.color }}>{worstCat.label}</strong> which declined the most.</>;
              } else if (trends[worstCat.key].delta < -3) {
                return <><strong style={{ color: worstCat.color }}>{worstCat.label}</strong> declined by {trends[worstCat.key].delta} points. Consider re-checking recent changes.</>;
              } else if (trends[bestCat.key].delta > 3) {
                return <><strong style={{ color: bestCat.color }}>{bestCat.label}</strong> improved by +{trends[bestCat.key].delta} points since last scan. Great progress!</>;
              }
              return <>Scores are holding steady. Keep monitoring to catch any regressions early.</>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
