// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useMemo } from "react";
import { theme } from "../config/theme";
import { tierAtLeast } from "../config/tiers";
import { generateRecommendations, computeInsightsSummary } from "../utils/recommendations";
import RecommendationCard from "./RecommendationCard";
import SectionHeader from "./SectionHeader";
import UpgradeBanner from "./UpgradeBanner";
import AISummaryCard from "./AISummaryCard";

const filterOptions = [
  { id: "all", label: "All", icon: "◉" },
  { id: "critical", label: "Critical", icon: "▲" },
  { id: "quickWin", label: "Quick Wins", icon: "⚡" },
  { id: "seo", label: "SEO", icon: "🔍" },
  { id: "llm", label: "AI Search", icon: "🤖" },
  { id: "marketing", label: "Marketing", icon: "📣" },
  { id: "performance", label: "Speed", icon: "⚡" },
  { id: "wordpress", label: "WordPress", icon: "◉" },
];

export default function InsightsPanel({ results, scores, tier, onGenerateSummary, summaryLoading, summaryData, summaryError, userTier, onUpgrade, industry }) {
  const [filter, setFilter] = useState("all");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const recommendations = useMemo(
    () => generateRecommendations(results, tier),
    [results, tier]
  );

  const summary = useMemo(
    () => computeInsightsSummary(recommendations, scores),
    [recommendations, scores]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return recommendations;
    if (filter === "critical") return recommendations.filter(r => r.priority === "critical");
    if (filter === "quickWin") return recommendations.filter(r => r.quickWin);
    return recommendations.filter(r => r.category === filter);
  }, [recommendations, filter]);

  const overallScore = scores
    ? (tier === "free"
      ? scores.seo
      : Math.round((scores.seo + scores.llm + scores.marketing) / 3))
    : 0;

  const scoreGrade = overallScore >= 85 ? "A" : overallScore >= 70 ? "B" : overallScore >= 50 ? "C" : overallScore >= 30 ? "D" : "F";
  const gradeColor = overallScore >= 75 ? theme.accent : overallScore >= 45 ? theme.warning : theme.danger;

  return (
    <div>
      {/* AI Summary — collapsible */}
      <div style={{
        marginBottom: 22,
        background: theme.surface,
        borderRadius: 14,
        border: `1px solid ${theme.cardBorder}`,
        overflow: "hidden",
      }}>
        <div
          onClick={() => { if (summaryData) setSummaryOpen(o => !o); }}
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: summaryData ? "pointer" : "default",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {summaryData && (
              <span style={{
                fontSize: 10, color: theme.textDim,
                transition: "transform 0.2s",
                transform: summaryOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}>▶</span>
            )}
            <span style={{ color: theme.violet, fontSize: 14 }}>✦</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: theme.text,
              fontFamily: theme.fontBody,
            }}>AI Audit Summary</span>
          </div>
          {!summaryData && !summaryLoading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!userTier || userTier === "free") {
                  onUpgrade?.();
                } else {
                  setSummaryOpen(true);
                  onGenerateSummary?.();
                }
              }}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: `1px solid ${(!userTier || userTier === "free") ? theme.cardBorder : theme.violet}44`,
                background: (!userTier || userTier === "free") ? "transparent" : theme.violetGlow,
                color: (!userTier || userTier === "free") ? theme.textDim : theme.violet,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: theme.fontMono,
                cursor: "pointer",
              }}
            >✦ Generate</button>
          )}
        </div>
        {(summaryOpen || summaryLoading) && (summaryData || summaryLoading || summaryError) && (
          <div style={{ padding: "0 20px 20px" }}>
            <AISummaryCard
              summary={summaryData}
              loading={summaryLoading}
              error={summaryError}
              onGenerate={onGenerateSummary}
              userTier={userTier}
              onUpgrade={onUpgrade}
              industry={industry}
            />
          </div>
        )}
      </div>

      {/* Summary grid */}
      <div className="sap-insights-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
        gap: 10, marginBottom: 22,
      }}>
        {/* Grade card */}
        <div style={{
          gridRow: "1 / 3",
          background: theme.surface,
          borderRadius: 16,
          border: `1px solid ${theme.cardBorder}`,
          padding: 24,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", width: 130, height: 130, borderRadius: "50%",
            background: `radial-gradient(circle, ${gradeColor}12, transparent 65%)`,
            top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }} />
          <div style={{
            fontSize: 56, fontWeight: 800,
            fontFamily: theme.fontDisplay,
            color: gradeColor, lineHeight: 1, position: "relative",
            letterSpacing: "-0.03em",
          }}>
            {scoreGrade}
          </div>
          <div style={{
            fontSize: 10, color: theme.textDim, marginTop: 8,
            fontFamily: theme.fontMono, letterSpacing: "0.08em",
          }}>SITE GRADE</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>
            {summary.totalIssues} issue{summary.totalIssues !== 1 ? "s" : ""} found
          </div>
        </div>

        {/* Stat cards */}
        {[
          { value: summary.critical, label: "Critical", color: theme.danger, bg: theme.dangerGlow, border: "rgba(255,77,106,0.15)", icon: "▲" },
          { value: summary.important, label: "Important", color: theme.warning, bg: theme.warningGlow, border: "rgba(255,178,36,0.15)", icon: "◆" },
          { value: summary.quickWins, label: "Quick Wins", color: theme.accent, bg: theme.accentGlow, border: "rgba(0,245,212,0.15)", icon: "⚡" },
          { value: `+${summary.potentialGain}`, label: "Potential Gain", color: theme.info, bg: theme.infoGlow, border: "rgba(91,141,239,0.15)", icon: "↑", suffix: "pts" },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: "16px 18px", background: stat.bg,
            borderRadius: 12, border: `1px solid ${stat.border}`,
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{
                fontSize: 26, fontWeight: 800, fontFamily: theme.fontDisplay,
                color: stat.color, lineHeight: 1, letterSpacing: "-0.02em",
              }}>
                {stat.value}
              </span>
              {stat.suffix && (
                <span style={{
                  fontSize: 10, color: stat.color,
                  fontFamily: theme.fontMono, opacity: 0.6,
                }}>{stat.suffix}</span>
              )}
            </div>
            <div style={{
              fontSize: 10, color: theme.textMuted, marginTop: 5,
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: theme.fontMono, letterSpacing: "0.04em",
            }}>
              <span style={{ fontSize: 8, color: stat.color }}>{stat.icon}</span>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Issue distribution */}
      {summary.totalIssues > 0 && (
        <div style={{
          marginBottom: 22, padding: "16px 22px",
          background: theme.surface, borderRadius: 14,
          border: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 10,
          }}>
            <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>Issue distribution</span>
            <span style={{ fontSize: 10, color: theme.textDim, fontFamily: theme.fontMono }}>
              {summary.totalIssues} total
            </span>
          </div>
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 2 }}>
            {summary.critical > 0 && (
              <div style={{
                flex: summary.critical,
                background: `linear-gradient(90deg, ${theme.danger}, #FF7A92)`,
                borderRadius: 3,
                transition: "flex 0.6s cubic-bezier(0.22,1,0.36,1)",
              }} />
            )}
            {summary.important > 0 && (
              <div style={{
                flex: summary.important,
                background: `linear-gradient(90deg, ${theme.warning}, #FFD166)`,
                borderRadius: 3,
                transition: "flex 0.6s cubic-bezier(0.22,1,0.36,1)",
              }} />
            )}
            {summary.optional > 0 && (
              <div style={{
                flex: summary.optional,
                background: `linear-gradient(90deg, ${theme.info}, #7FADFF)`,
                borderRadius: 3,
                transition: "flex 0.6s cubic-bezier(0.22,1,0.36,1)",
              }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
            {[
              { label: "Critical", count: summary.critical, color: theme.danger },
              { label: "Important", count: summary.important, color: theme.warning },
              { label: "Optional", count: summary.optional, color: theme.info },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span style={{ fontSize: 11, color: theme.textMuted }}>{s.label} ({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="sap-insights-filters" style={{
        display: "flex", gap: 3, marginBottom: 18, padding: 3,
        background: theme.surface, borderRadius: 10,
        border: `1px solid ${theme.cardBorder}`,
        width: "fit-content", flexWrap: "wrap",
      }}>
        {filterOptions
          .filter(f => {
            if (tier === "free" && (f.id === "llm" || f.id === "marketing")) return false;
            if (f.id === "wordpress" && !results?.wordpress?.available) return false;
            return true;
          })
          .map(f => {
            const count = f.id === "all" ? recommendations.length
              : f.id === "critical" ? summary.critical
              : f.id === "quickWin" ? summary.quickWins
              : recommendations.filter(r => r.category === f.id).length;

            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`tab-btn ${filter === f.id ? "active" : ""}`}
                style={{
                  padding: "8px 14px",
                  opacity: count === 0 ? 0.35 : 1,
                  fontSize: 12,
                }}>
                <span style={{ fontSize: 11 }}>{f.icon}</span>
                {f.label}
                <span style={{
                  fontSize: 10,
                  color: filter === f.id ? theme.accent : theme.textDim,
                  fontFamily: theme.fontMono, marginLeft: 2,
                }}>{count}</span>
              </button>
            );
          })}
      </div>

      {/* Recommendations */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 44, textAlign: "center",
            background: theme.surface, borderRadius: 16,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: theme.accentGlow,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, marginBottom: 14,
            }}>✓</div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: theme.accent, marginBottom: 6,
              fontFamily: theme.fontDisplay,
            }}>
              {filter === "all" ? "All checks passed!" : `No ${filter} issues found`}
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted }}>
              {filter === "all"
                ? "Your site is performing well across all analyzed categories."
                : "Try a different filter to see other recommendations."}
            </div>
          </div>
        )}

        {filtered.map((rec, i) => (
          <RecommendationCard key={`${rec.category}-${rec.sourceLabel}-${i}`} rec={rec} index={i} total={filtered.length} />
        ))}
      </div>

      {/* Free tier CTA */}
      {tier === "free" && (
        <div style={{ marginTop: 16 }}>
          <UpgradeBanner requiredTier="pro" compact featureDesc="Unlock AI Search, Marketing & Performance recommendations with Pro" />
        </div>
      )}

      {/* Bottom tip */}
      {filtered.length > 0 && (
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
            <strong style={{ color: theme.text }}>Pro tip:</strong>{" "}
            Start with {summary.quickWins > 0 ? `the ${summary.quickWins} quick win${summary.quickWins > 1 ? "s" : ""} — low effort, high impact` : "critical issues first"}.
            {summary.potentialGain > 5 && (
              <> Fixing all issues could improve your overall score by up to <strong style={{ color: theme.accent }}>{summary.potentialGain} points</strong>.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
