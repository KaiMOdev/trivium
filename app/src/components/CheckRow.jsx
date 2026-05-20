// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, memo } from "react";
import { theme } from "../config/theme";
import explanations from "../config/explanations";
import { getStatus } from "../utils/status";
import ScoreRing from "./ScoreRing";
import StatusBadge from "./StatusBadge";

export default memo(function CheckRow({ item, index, blurred }) {
  const [expanded, setExpanded] = useState(false);
  const info = explanations[item.label];
  const clickable = !blurred && !!info;
  const status = getStatus(item);

  return (
    <>
    <div
      onClick={() => clickable && setExpanded(!expanded)}
      style={{
        borderRadius: 10,
        background: expanded ? "rgba(255,255,255,0.02)" : index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
        filter: blurred ? "blur(4px)" : "none",
        userSelect: blurred ? "none" : "auto",
        cursor: clickable ? "pointer" : "default",
        transition: "background 0.25s",
      }}
    >
      <div className="sap-check-row" style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
      }}>
        <div>
          <div style={{ color: theme.text, fontSize: 14, fontWeight: 600, fontFamily: theme.fontBody, display: "flex", alignItems: "center", gap: 6 }}>
            {item.label}
            {item.aiPowered && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                padding: "1px 5px", borderRadius: 4,
                background: theme.violetGlow, color: theme.violet,
                fontFamily: theme.fontMono, lineHeight: 1.4,
              }}>AI</span>
            )}
          </div>
          <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{item.detail}</div>
          {item.items?.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
              {item.items.slice(0, 8).map((it, i) => (
                <div key={i} style={{
                  display: "flex", gap: 6, fontSize: 11,
                  color: theme.textDim, lineHeight: 1.4,
                  fontFamily: theme.fontMono,
                }}>
                  <span style={{
                    color: status === "pass" ? theme.accent : status === "warn" ? theme.warning : theme.danger,
                    fontSize: 5, marginTop: 5, flexShrink: 0,
                  }}>●</span>
                  <span className="sap-check-row-items" style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 500,
                  }}>{it}</span>
                </div>
              ))}
              {item.items.length > 8 && (
                <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>
                  +{item.items.length - 8} more...
                </div>
              )}
            </div>
          )}
        </div>
        <span className="sap-check-row-ring"><ScoreRing score={item.score} size={40} strokeWidth={3} /></span>
        <StatusBadge status={status} />
        {clickable && (
          <span className="sap-check-row-expand" style={{
            fontSize: 14, color: theme.textDim,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
            lineHeight: 1, width: 16, textAlign: "center",
          }}>▾</span>
        )}
      </div>

      {expanded && info && (
        <div style={{
          padding: "0 18px 18px 18px",
          borderTop: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{ paddingTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: theme.textDim,
                fontFamily: theme.fontMono, marginBottom: 6,
              }}>Why it matters</div>
              <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.7 }}>{info.why}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
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
