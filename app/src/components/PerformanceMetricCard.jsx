// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState } from "react";
import { theme } from "../config/theme";
import explanations from "../config/explanations";
import ScoreRing from "./ScoreRing";

export default function PerformanceMetricCard({ m, available }) {
  const [expanded, setExpanded] = useState(false);
  const info = explanations[m.label];
  const clickable = available && !!info;
  const metricColor = m.score >= 75 ? theme.accent : m.score >= 45 ? theme.warning : theme.danger;
  const status = m.score >= 75 ? "pass" : m.score >= 45 ? "warn" : "fail";

  return (
    <div
      onClick={() => clickable && setExpanded(!expanded)}
      style={{
        padding: 20, borderRadius: 14,
        background: available ? theme.surface : "rgba(255,255,255,0.01)",
        border: `1px solid ${expanded ? theme.cardBorderHover : (available ? theme.cardBorder : "rgba(255,255,255,0.03)")}`,
        textAlign: "center",
        opacity: available ? 1 : 0.25,
        filter: available ? "none" : "blur(3px)",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s",
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {/* Color accent line at top */}
      {available && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${metricColor}, transparent)`,
          opacity: 0.5,
        }} />
      )}

      {available ? <ScoreRing score={m.score} size={52} strokeWidth={4} /> : (
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: theme.surface, border: `2px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: theme.textDim }}>—</span>
        </div>
      )}
      <div style={{
        marginTop: 12, fontWeight: 700, fontSize: 20,
        fontFamily: theme.fontMono, color: theme.text,
        letterSpacing: "-0.02em",
      }}>
        {available ? m.value : "—"}
      </div>
      <div style={{
        color: theme.violet, fontSize: 11, marginTop: 4,
        fontWeight: 700, fontFamily: theme.fontMono,
        letterSpacing: "0.04em",
      }}>{m.label}</div>
      <div style={{ color: theme.textDim, fontSize: 11, marginTop: 4 }}>{m.fullName}</div>
      <div style={{
        color: theme.textMuted, fontSize: 10, marginTop: 3,
        fontFamily: theme.fontMono,
      }}>Target: {m.target}</div>
      {available && m.source && (
        <div style={{
          marginTop: 8, fontSize: 9, padding: "3px 10px", borderRadius: 100,
          display: "inline-flex", alignItems: "center", gap: 4,
          background: m.source === "field" ? theme.accentGlow : theme.violetGlow,
          color: m.source === "field" ? theme.accent : theme.violet,
          fontFamily: theme.fontMono, fontWeight: 600, letterSpacing: "0.04em",
        }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />
          {m.source === "field" ? "REAL USERS" : "LAB DATA"}
        </div>
      )}
      {available && m.detail && (
        <div style={{
          color: theme.textMuted, fontSize: 10, marginTop: 8, lineHeight: 1.5,
          padding: "8px 10px", borderRadius: 8,
          background: "rgba(255,255,255,0.015)",
        }}>
          {m.detail}
        </div>
      )}
      {/* Expand chevron */}
      {clickable && (
        <div style={{
          marginTop: 8, fontSize: 12, color: theme.textDim,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}>▾</div>
      )}

      {/* Expanded expert panel */}
      {expanded && info && (
        <div style={{
          marginTop: 12, padding: "14px 12px 4px",
          borderTop: `1px solid ${theme.cardBorder}`,
          textAlign: "left",
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: theme.textDim,
              fontFamily: theme.fontMono, marginBottom: 6,
            }}>Why it matters</div>
            <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.7 }}>{info.why}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: theme.textDim,
              fontFamily: theme.fontMono, marginBottom: 6,
            }}>How to fix</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {info.howToFix?.map((step, i) => (
                <div key={i} style={{
                  display: "flex", gap: 8, fontSize: 12,
                  color: theme.textMuted, lineHeight: 1.6,
                }}>
                  <span style={{
                    color: status === "pass" ? theme.accent : status === "warn" ? theme.warning : theme.danger,
                    fontSize: 7, marginTop: 6, flexShrink: 0,
                  }}>●</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {info.learnMore && (
            <div style={{
              padding: "10px 12px",
              background: theme.infoGlow,
              borderRadius: 8,
              border: "1px solid rgba(91,141,239,0.12)",
              fontSize: 11, color: theme.info, lineHeight: 1.6,
              display: "flex", gap: 6, alignItems: "flex-start",
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>💡</span>
              <span>{info.learnMore}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
