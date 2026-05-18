// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { memo } from "react";
import { theme } from "../config/theme";
import ScoreRing from "./ScoreRing";

const BASE_CATEGORIES = [
  { key: "seo", label: "SEO", color: theme.accent },
  { key: "llm", label: "AI Search", color: theme.info },
  { key: "marketing", label: "Marketing", color: theme.warning },
  { key: "performance", label: "Speed", color: theme.violet },
];

const BACKLINKS_CATEGORY = { key: "backlinks", label: "Backlinks", color: theme.info };

const SITE_COLORS = [
  theme.accent,    // primary — teal
  theme.danger,    // competitor 1 — coral red
  "#FF9F43",       // competitor 2 — orange
  "#A777FF",       // competitor 3 — violet
  "#5B8DEF",       // competitor 4 — blue
  "#FFD666",       // competitor 5+ — gold
];

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

/** SVG Radar/Spider chart comparing scores across categories */
function RadarChart({ sites, categories }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40;
  const n = categories.length;
  const angleStep = (2 * Math.PI) / n;

  // Helper: point on the radar at a given category index and score (0-100)
  const point = (catIdx, score) => {
    const angle = angleStep * catIdx - Math.PI / 2; // start from top
    const r = (score / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  // Grid rings at 25, 50, 75, 100
  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {/* Grid rings */}
      {rings.map((v) => {
        const pts = Array.from({ length: n }, (_, i) => point(i, v));
        return (
          <polygon key={v}
            points={pts.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={theme.cardBorder}
            strokeWidth={v === 100 ? 1.5 : 0.8}
            opacity={v === 100 ? 0.6 : 0.3}
          />
        );
      })}

      {/* Axis lines */}
      {categories.map((_, i) => {
        const [ex, ey] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={theme.cardBorder} strokeWidth={0.8} opacity={0.3} />;
      })}

      {/* Data polygons — one per site */}
      {sites.map((site, si) => {
        if (site.error) return null;
        const color = SITE_COLORS[si % SITE_COLORS.length];
        const pts = categories.map((cat, ci) => point(ci, site.scores[cat.key] || 0));
        const pathStr = pts.map((p) => p.join(",")).join(" ");
        return (
          <g key={si}>
            <polygon
              points={pathStr}
              fill={color}
              fillOpacity={0.08}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              style={{ transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)" }}
            />
            {pts.map((p, ci) => (
              <circle key={ci} cx={p[0]} cy={p[1]} r={3.5}
                fill={color} stroke={theme.bg} strokeWidth={1.5}
                style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
              />
            ))}
          </g>
        );
      })}

      {/* Category labels */}
      {categories.map((cat, i) => {
        const [lx, ly] = point(i, 112);
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fill={theme.textMuted}
            fontSize={11}
            fontFamily={theme.fontMono}
            fontWeight={600}
            letterSpacing="0.04em"
          >{cat.label}</text>
        );
      })}

      {/* Ring value labels */}
      {rings.map((v) => {
        const [, ly] = point(0, v);
        return (
          <text key={v} x={cx + 4} y={ly - 4}
            fill={theme.textDim} fontSize={8} fontFamily={theme.fontMono} opacity={0.6}
          >{v}</text>
        );
      })}
    </svg>
  );
}

/** Single category bar comparing all sites */
function CategoryBar({ category, sites }) {
  const maxScore = Math.max(...sites.filter((s) => !s.error).map((s) => s.scores[category.key] || 0));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 11, fontFamily: theme.fontMono, color: theme.textMuted,
          letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600,
        }}>{category.label}</span>
      </div>
      {sites.map((site, si) => {
        if (site.error) return null;
        const score = site.scores[category.key] || 0;
        const isWinner = score === maxScore && maxScore > 0;
        const color = SITE_COLORS[si % SITE_COLORS.length];
        return (
          <div key={si} style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 5,
          }}>
            <span style={{
              fontSize: 10, color: theme.textDim, fontFamily: theme.fontMono,
              width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              flexShrink: 0,
            }}>{getHostname(site.url)}</span>
            <div style={{
              flex: 1, height: 22, borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${theme.cardBorder}`,
              overflow: "hidden", position: "relative",
            }}>
              <div style={{
                height: "100%", width: `${score}%`, borderRadius: 5,
                background: `linear-gradient(90deg, ${color}40, ${color}90)`,
                transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                position: "relative",
              }}>
                {isWinner && (
                  <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: 3,
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                  }} />
                )}
              </div>
            </div>
            <span style={{
              fontSize: 13, fontWeight: 700, fontFamily: theme.fontMono,
              color: isWinner ? color : theme.textMuted,
              width: 32, textAlign: "right", flexShrink: 0,
            }}>{score}</span>
            {isWinner && (
              <span style={{
                fontSize: 8, padding: "2px 6px", borderRadius: 4,
                background: `${color}18`, color,
                fontFamily: theme.fontMono, fontWeight: 700,
                letterSpacing: "0.06em",
              }}>WIN</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Delta badge showing score difference */
function DeltaBadge({ value }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: theme.fontMono,
      color: positive ? theme.accent : theme.danger,
      display: "inline-flex", alignItems: "center", gap: 2,
    }}>
      {positive ? "+" : ""}{value}
    </span>
  );
}

export default memo(function CompetitorPanel({ primary, competitors }) {
  if (!primary || !competitors || competitors.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: "center", color: theme.textMuted, fontSize: 13,
        background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
      }}>
        No competitor data available. Add competitor URLs before scanning.
      </div>
    );
  }

  const allSites = [primary, ...competitors];
  const validSites = allSites.filter((s) => !s.error);

  // Include Backlinks as 5th axis only when at least one site has a non-null backlinks score
  const hasBacklinks = validSites.some((s) => s.scores && s.scores.backlinks != null);
  const CATEGORIES = hasBacklinks
    ? [...BASE_CATEGORIES, BACKLINKS_CATEGORY]
    : BASE_CATEGORIES;

  // Calculate wins per site
  const wins = validSites.map((site) =>
    CATEGORIES.reduce((count, cat) => {
      const max = Math.max(...validSites.map((s) => s.scores[cat.key] || 0));
      return count + (site.scores[cat.key] === max && max > 0 ? 1 : 0);
    }, 0)
  );

  // Overall score for each site
  const overallScores = validSites.map((site) => {
    const scores = CATEGORIES.map((cat) => site.scores[cat.key] || 0);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  });

  const primaryOverall = overallScores[0] || 0;

  return (
    <div style={{
      background: theme.card, borderRadius: 16,
      border: `1px solid ${theme.cardBorder}`,
      padding: 28, position: "relative", overflow: "hidden",
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 200, height: 200, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,245,212,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "linear-gradient(135deg, rgba(0,245,212,0.12), rgba(167,119,255,0.12))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15,
        }}>&#x2694;</div>
        <div>
          <h3 style={{
            fontFamily: theme.fontDisplay, fontSize: 18, fontWeight: 700,
            letterSpacing: "-0.02em", margin: 0,
          }}>Competitor Benchmarking</h3>
          <p style={{ color: theme.textMuted, fontSize: 12, margin: "3px 0 0" }}>
            Side-by-side comparison across {CATEGORIES.length} categories
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24, marginTop: 18,
        padding: "12px 16px", borderRadius: 10,
        background: theme.surface,
        border: `1px solid ${theme.cardBorder}`,
      }}>
        {allSites.map((site, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 3,
              background: SITE_COLORS[i % SITE_COLORS.length],
              boxShadow: `0 0 6px ${SITE_COLORS[i % SITE_COLORS.length]}50`,
            }} />
            <span style={{
              fontSize: 12, fontFamily: theme.fontMono,
              color: i === 0 ? theme.text : theme.textMuted,
              fontWeight: i === 0 ? 600 : 400,
            }}>
              {getHostname(site.url)}
              {i === 0 && <span style={{
                marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 4,
                background: theme.accentGlow, color: theme.accent,
                fontWeight: 700, letterSpacing: "0.04em",
              }}>YOU</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Main layout: radar + scores side by side */}
      <div style={{
        display: "grid", gridTemplateColumns: "320px 1fr", gap: 28,
        alignItems: "start",
      }}>
        {/* Radar Chart */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "16px 0",
        }}>
          <RadarChart sites={allSites} categories={CATEGORIES} />
        </div>

        {/* Score Cards + Bars */}
        <div>
          {/* Overall score comparison */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(validSites.length, 4)}, 1fr)`,
            gap: 10, marginBottom: 24,
          }}>
            {validSites.map((site, i) => {
              const overall = overallScores[i];
              const delta = i === 0 ? 0 : overall - primaryOverall;
              const color = SITE_COLORS[i % SITE_COLORS.length];
              return (
                <div key={i} style={{
                  padding: "18px 14px", borderRadius: 14, textAlign: "center",
                  background: i === 0 ? `${color}08` : theme.surface,
                  border: `1px solid ${i === 0 ? `${color}20` : theme.cardBorder}`,
                  transition: "all 0.3s",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                    <ScoreRing score={overall} size={56} strokeWidth={4} />
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, fontFamily: theme.fontMono,
                    color: theme.text, overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", marginBottom: 4,
                  }}>{getHostname(site.url)}</div>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <span style={{
                      fontSize: 9, color: theme.textDim, fontFamily: theme.fontMono,
                    }}>{wins[i]}/{CATEGORIES.length} wins</span>
                    {delta !== 0 && <DeltaBadge value={delta} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category bars */}
          {CATEGORIES.map((cat) => (
            <CategoryBar key={cat.key} category={cat} sites={allSites} />
          ))}
        </div>
      </div>

      {/* Detailed head-to-head breakdown */}
      <div style={{ marginTop: 28 }}>
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
          }}>&#x2261;</span>
          Head-to-Head Summary
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${CATEGORIES.length}, 1fr)`,
          gap: 10,
        }}>
          {CATEGORIES.map((cat) => {
            const scores = validSites.map((s) => s.scores[cat.key] || 0);
            const max = Math.max(...scores);
            const winnerIdx = scores.indexOf(max);
            const primaryScore = scores[0] || 0;
            const diff = primaryScore - max;

            return (
              <div key={cat.key} style={{
                padding: "16px 14px", borderRadius: 12,
                background: theme.surface,
                border: `1px solid ${theme.cardBorder}`,
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 10, fontFamily: theme.fontMono, color: theme.textDim,
                  letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
                }}>{cat.label}</div>
                <div style={{
                  fontSize: 24, fontWeight: 800, fontFamily: theme.fontDisplay,
                  color: winnerIdx === 0 ? theme.accent : theme.textMuted,
                  lineHeight: 1,
                }}>{primaryScore}</div>
                {winnerIdx !== 0 && (
                  <div style={{ marginTop: 6 }}>
                    <DeltaBadge value={diff} />
                    <div style={{
                      fontSize: 9, color: theme.textDim, marginTop: 3,
                      fontFamily: theme.fontMono,
                    }}>vs {getHostname(validSites[winnerIdx].url)}</div>
                  </div>
                )}
                {winnerIdx === 0 && (
                  <div style={{
                    marginTop: 6, fontSize: 9, padding: "2px 8px", borderRadius: 4,
                    background: theme.accentGlow, color: theme.accent,
                    fontFamily: theme.fontMono, fontWeight: 700,
                    display: "inline-block", letterSpacing: "0.04em",
                  }}>LEADING</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error notices for failed competitor scans */}
      {allSites.filter((s) => s.error).map((site, i) => (
        <div key={i} style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 10,
          background: theme.dangerGlow, border: `1px solid rgba(255,77,106,0.15)`,
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 12, color: theme.danger,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>!</span>
          <span>
            <strong>{getHostname(site.url)}</strong>: {site.error}
          </span>
        </div>
      ))}
    </div>
  );
})
