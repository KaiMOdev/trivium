// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../config/theme";

const shimmerStyle = {
  background: `linear-gradient(90deg, ${theme.cardBorder}, ${theme.surfaceHover}, ${theme.cardBorder})`,
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: 8,
};

const sectionLabelStyle = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontFamily: theme.fontMono,
  marginBottom: 8,
};

export default function AISummaryCard({ summary, loading, error, onGenerate, userTier, onUpgrade, industry }) {
  // Error state
  if (error && !summary && !loading) {
    return (
      <div style={{
        padding: "16px 20px",
        borderRadius: 12,
        background: theme.dangerGlow,
        border: `1px solid ${theme.danger}33`,
      }}>
        <div style={{ fontSize: 13, color: theme.danger, marginBottom: 10 }}>{error}</div>
        <button
          onClick={() => onGenerate?.()}
          style={{
            padding: "6px 16px", borderRadius: 6,
            background: "transparent", border: `1px solid ${theme.danger}44`,
            color: theme.danger, fontSize: 12, cursor: "pointer",
          }}
        >Try again</button>
      </div>
    );
  }

  // Not generated yet
  if (!summary && !loading) {
    return (
      <div style={{
        padding: "24px",
        background: theme.surface,
        borderRadius: 14,
        border: `1px solid ${theme.cardBorder}`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: theme.text,
          fontFamily: theme.fontBody, marginBottom: 6,
        }}>AI-Powered Audit Summary</div>
        <div style={{
          fontSize: 12, color: theme.textMuted, marginBottom: 18, lineHeight: 1.6,
        }}>Get a prioritized action plan based on your scan results</div>
        {!industry && (
          <div style={{
            fontSize: 12, color: theme.textMuted, fontFamily: theme.fontBody,
            marginBottom: 12, fontStyle: "italic",
          }}>
            Set your industry in Profile settings for personalized recommendations
          </div>
        )}
        <button
          onClick={() => {
            if (!userTier || userTier === "free") {
              onUpgrade?.();
            } else {
              onGenerate?.();
            }
          }}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: `1px solid ${(!userTier || userTier === "free") ? theme.cardBorder : theme.violet}66`,
            background: (!userTier || userTier === "free") ? "transparent" : theme.violetGlow,
            color: (!userTier || userTier === "free") ? theme.textDim : theme.violet,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: theme.fontBody,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ✦ Generate AI Summary
        </button>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div style={{
        padding: "24px",
        background: theme.surface,
        borderRadius: 14,
        border: `1px solid ${theme.cardBorder}`,
      }}>
        <div style={{ ...shimmerStyle, height: 48, marginBottom: 16 }} />
        <div style={{ ...shimmerStyle, height: 20, width: "80%", marginBottom: 10 }} />
        <div style={{ ...shimmerStyle, height: 20, width: "60%", marginBottom: 10 }} />
        <div style={{ ...shimmerStyle, height: 20, width: "70%", marginBottom: 16 }} />
        <div style={{ ...shimmerStyle, height: 20, width: "50%", marginBottom: 10 }} />
        <div style={{ ...shimmerStyle, height: 20, width: "65%" }} />
      </div>
    );
  }

  // Summary loaded
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Overall Assessment */}
      <div style={{
        padding: "16px 20px",
        borderRadius: 12,
        background: theme.violetGlow,
        borderLeft: `3px solid ${theme.violet}`,
      }}>
        <div style={{ ...sectionLabelStyle, color: theme.violet }}>Overall Assessment</div>
        <div style={{
          fontSize: 14, color: theme.text, lineHeight: 1.7,
          fontFamily: theme.fontBody,
        }}>{summary.overall}</div>
      </div>

      {/* Critical Issues */}
      {summary.critical?.length > 0 && (
        <div style={{
          padding: "16px 20px",
          borderRadius: 12,
          background: theme.surface,
          border: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{ ...sectionLabelStyle, color: theme.danger }}>Top Critical Issues</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.critical.map((item, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, fontSize: 13,
                color: theme.text, lineHeight: 1.6,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: theme.dangerGlow,
                  color: theme.danger,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                  fontFamily: theme.fontMono,
                }}>{i + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {summary.quickWins?.length > 0 && (
        <div style={{
          padding: "16px 20px",
          borderRadius: 12,
          background: theme.surface,
          border: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{ ...sectionLabelStyle, color: theme.accent }}>Quick Wins</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.quickWins.map((item, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, fontSize: 13,
                color: theme.text, lineHeight: 1.6,
              }}>
                <span style={{
                  color: theme.accent, fontSize: 14, flexShrink: 0, marginTop: 1,
                }}>⚡</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Long-term Strategy */}
      {summary.longTerm?.length > 0 && (
        <div style={{
          padding: "16px 20px",
          borderRadius: 12,
          background: theme.surface,
          border: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{ ...sectionLabelStyle, color: theme.info }}>Long-term Strategy</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.longTerm.map((item, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, fontSize: 13,
                color: theme.text, lineHeight: 1.6,
              }}>
                <span style={{
                  color: theme.info, fontSize: 10, flexShrink: 0, marginTop: 4,
                }}>◆</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
