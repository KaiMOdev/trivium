// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, memo } from "react";
import { theme } from "../config/theme";
import explanations from "../config/explanations";
import { getStatus } from "../utils/status";
import ScoreRing from "./ScoreRing";

export default memo(function ScoreCard({ item, blurred }) {
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
        gridTemplateColumns: "52px 1fr auto",
        gap: 16, alignItems: "center",
        padding: "14px 16px",
      }}>
        <ScoreRing score={item.score} size={48} strokeWidth={3} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>{item.label}</div>
          <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 3, lineHeight: 1.6 }}>{item.detail}</div>
        </div>
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
          </div>
        </div>
      )}
    </div>
    </>
  );
})
