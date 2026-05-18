// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState } from "react";
import { theme } from "../config/theme";

const priorityConfig = {
  critical: {
    color: theme.danger,
    bg: theme.dangerGlow,
    border: "rgba(255,77,106,0.2)",
    glow: "rgba(255,77,106,0.03)",
    icon: "▲",
    label: "CRITICAL",
  },
  important: {
    color: theme.warning,
    bg: theme.warningGlow,
    border: "rgba(255,178,36,0.2)",
    glow: "rgba(255,178,36,0.03)",
    icon: "◆",
    label: "IMPORTANT",
  },
  optional: {
    color: theme.info,
    bg: theme.infoGlow,
    border: "rgba(91,141,239,0.15)",
    glow: "rgba(91,141,239,0.03)",
    icon: "○",
    label: "OPTIONAL",
  },
};

const categoryConfig = {
  seo: { icon: "🔍", label: "SEO", color: theme.accent },
  llm: { icon: "🤖", label: "AI Search", color: theme.info },
  marketing: { icon: "📣", label: "Marketing", color: theme.warning },
  performance: { icon: "⚡", label: "Speed", color: theme.violet },
};

const impactBars = { high: 3, medium: 2, low: 1 };
const effortLabels = { low: "Quick fix", medium: "Moderate effort", high: "Significant effort" };

export default function RecommendationCard({ rec }) {
  const [expanded, setExpanded] = useState(false);
  const p = priorityConfig[rec.priority] || priorityConfig.important;
  const cat = categoryConfig[rec.category] || categoryConfig.seo;
  const bars = impactBars[rec.impact] || 2;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="card-hover"
      style={{
        background: expanded ? p.glow : theme.card,
        borderRadius: 14,
        border: `1px solid ${expanded ? p.border : theme.cardBorder}`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div className="sap-rec-card-grid" style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 16, padding: "16px 20px", alignItems: "center",
      }}>
        {/* Priority bar */}
        <div style={{
          width: 3, height: 36, borderRadius: 2,
          background: p.color, opacity: 0.7,
          boxShadow: `0 0 10px ${p.color}30`,
        }} />

        {/* Content */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 4,
              background: p.bg, color: p.color,
              fontFamily: theme.fontMono,
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              <span style={{ fontSize: 7 }}>{p.icon}</span> {p.label}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.05em",
              padding: "2px 7px", borderRadius: 4,
              background: `${cat.color}10`,
              color: cat.color, fontFamily: theme.fontMono,
            }}>
              {cat.icon} {cat.label}
            </span>
            {rec.quickWin && (
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
                padding: "2px 7px", borderRadius: 4,
                background: theme.accentGlow, color: theme.accent,
                fontFamily: theme.fontMono,
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                ⚡ QUICK WIN
              </span>
            )}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 600, color: theme.text,
            marginTop: 7, lineHeight: 1.35,
          }}>
            {rec.title}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  width: 3, height: 5 + i * 4, borderRadius: 1.5,
                  background: i <= bars ? p.color : theme.cardBorder,
                  opacity: i <= bars ? 0.85 : 0.25,
                }} />
              ))}
            </div>
            <span style={{
              fontSize: 8, color: theme.textDim,
              fontFamily: theme.fontMono, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>Impact</span>
          </div>
          {rec.score != null && (
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: p.bg, border: `1px solid ${p.border}`,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: p.color,
                fontFamily: theme.fontMono,
              }}>{rec.score}</span>
            </div>
          )}
          <span style={{
            fontSize: 14, color: theme.textDim,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
            lineHeight: 1,
          }}>▾</span>
        </div>
      </div>

      {expanded && (
        <div style={{
          padding: "0 20px 18px 40px",
          borderTop: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{
            paddingTop: 14, fontSize: 13, color: theme.textMuted,
            lineHeight: 1.7, maxWidth: 640,
          }}>
            {rec.description}
          </div>
          <div className="sap-rec-card-meta" style={{
            display: "flex", gap: 20, marginTop: 14, paddingTop: 14,
            borderTop: `1px solid ${theme.cardBorder}`,
          }}>
            {[
              { label: "Effort", value: effortLabels[rec.effort] || rec.effort || "—" },
              { label: "Impact", value: rec.impact || "—", capitalize: true },
              { label: "Source check", value: rec.sourceLabel || "—" },
            ].map(item => (
              <div key={item.label}>
                <span style={{
                  fontSize: 9, color: theme.textDim,
                  fontFamily: theme.fontMono, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{item.label}</span>
                <div style={{
                  fontSize: 12, color: theme.text, marginTop: 3, fontWeight: 500,
                  textTransform: item.capitalize ? "capitalize" : "none",
                }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
