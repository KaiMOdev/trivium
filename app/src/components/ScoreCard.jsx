// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, memo } from "react";
import { theme } from "../config/theme";
import explanations from "../config/explanations";
import { getStatus } from "../utils/status";
import ScoreRing from "./ScoreRing";

export default memo(function ScoreCard({ item, blurred, onAIFix, userTier, aiLoading, aiResult, onUpgrade }) {
  const [expanded, setExpanded] = useState(false);
  const info = explanations[item.label];
  const clickable = !blurred && !!info;
  const status = getStatus(item);

  return (
    <>
    <div
      onClick={() => clickable && setExpanded(!expanded)}
      style={{
        background: expanded ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
        borderRadius: 12,
        border: `1px solid ${expanded ? theme.cardBorderHover : "transparent"}`,
        filter: blurred ? "blur(4px)" : "none",
        userSelect: blurred ? "none" : "auto",
        cursor: clickable ? "pointer" : "default",
        transition: "all 0.25s",
      }}
    >
      <div className="sap-score-card-grid" style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr auto auto",
        gap: 16, alignItems: "center",
        padding: "14px 16px",
      }}>
        <ScoreRing score={item.score} size={48} strokeWidth={3} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>{item.label}</div>
          <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 3, lineHeight: 1.6 }}>{item.detail}</div>
        </div>
        {item.score < 75 && onAIFix && (
          aiLoading ? (
            <div style={{
              width: 56, height: 24, borderRadius: 6,
              background: `linear-gradient(90deg, ${theme.cardBorder}, ${theme.surfaceHover}, ${theme.cardBorder})`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }} />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!userTier || userTier === "free") {
                  onUpgrade?.();
                } else {
                  onAIFix(item);
                }
              }}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${(!userTier || userTier === "free") ? theme.cardBorder : theme.violet}44`,
                background: (!userTier || userTier === "free") ? "transparent" : theme.violetGlow,
                color: (!userTier || userTier === "free") ? theme.textDim : theme.violet,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: theme.fontMono,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {aiResult ? "✓ AI" : "✦ AI Fix"}
            </button>
          )
        )}
        {clickable && (
          <span className="sap-score-card-expand" style={{
            fontSize: 14, color: theme.textDim,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
            lineHeight: 1, width: 16, textAlign: "center",
          }}>▾</span>
        )}
      </div>

      {expanded && info && (
        <div style={{
          padding: "0 16px 16px 16px",
          borderTop: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{ paddingTop: 14 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: theme.textDim,
                fontFamily: theme.fontMono, marginBottom: 6,
              }}>Why it matters</div>
              <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.7 }}>{info.why}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: theme.textDim,
                fontFamily: theme.fontMono, marginBottom: 6,
              }}>How to fix</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {info.howToFix?.map((step, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 8, fontSize: 13,
                    color: theme.textMuted, lineHeight: 1.6,
                  }}>
                    <span style={{
                      color: status === "pass" ? theme.accent : status === "warn" ? theme.warning : theme.danger,
                      fontSize: 7, marginTop: 7, flexShrink: 0,
                    }}>●</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {info.learnMore && (
              <div style={{
                padding: "12px 16px",
                background: theme.infoGlow,
                borderRadius: 10,
                border: "1px solid rgba(91,141,239,0.12)",
                fontSize: 12, color: theme.info, lineHeight: 1.6,
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>💡</span>
                <span>{info.learnMore}</span>
              </div>
            )}
            {aiResult && aiResult.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: theme.violet,
                  fontFamily: theme.fontMono, marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>✦</span> AI Suggestions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {aiResult.map((s, i) => (
                    <div key={i} style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: theme.violetGlow,
                      border: `1px solid ${theme.violet}22`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6 }}>{s.action}</div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                          padding: "2px 6px", borderRadius: 4,
                          background: s.priority === "high" ? theme.dangerGlow : s.priority === "medium" ? theme.warningGlow : theme.accentGlow,
                          color: s.priority === "high" ? theme.danger : s.priority === "medium" ? theme.warning : theme.accent,
                          whiteSpace: "nowrap", flexShrink: 0,
                        }}>{s.priority}</span>
                      </div>
                      {s.estimated_impact && (
                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{s.estimated_impact}</div>
                      )}
                      {s.code_snippet && (
                        <div style={{ marginTop: 8, position: "relative" }}>
                          <pre style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: theme.surface,
                            border: `1px solid ${theme.cardBorder}`,
                            color: theme.text,
                            fontSize: 11,
                            fontFamily: theme.fontMono,
                            lineHeight: 1.5,
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            margin: 0,
                          }}>{s.code_snippet}</pre>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(s.code_snippet);
                              e.currentTarget.textContent = "Copied!";
                              setTimeout(() => { e.currentTarget.textContent = "Copy"; }, 1500);
                            }}
                            style={{
                              position: "absolute", top: 6, right: 6,
                              padding: "2px 8px", borderRadius: 4,
                              background: theme.surfaceHover, border: `1px solid ${theme.cardBorder}`,
                              color: theme.textMuted, fontSize: 10, cursor: "pointer",
                              fontFamily: theme.fontMono,
                            }}
                          >Copy</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
})
