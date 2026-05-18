// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import React from "react";
import { theme } from "../config/theme";

export default function ScoreRing({ score, size = 56, strokeWidth = 4, glowing = false, label }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? theme.accent : score >= 45 ? theme.warning : theme.danger;
  const glowColor = score >= 75 ? "0,245,212" : score >= 45 ? "255,178,36" : "255,77,106";
  const stableId = React.useId ? React.useId() : `${size}-${label || "ring"}`;
  const uniqueId = `ring-${stableId}`;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label || "Score"}: ${score} out of 100`} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
        <defs>
          {glowing && (
            <filter id={`glow-${uniqueId}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
          <linearGradient id={`grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Track — subtle dotted ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={theme.cardBorder}
          strokeWidth={strokeWidth}
          strokeDasharray={size > 60 ? "2 4" : "1 3"}
          opacity="0.5"
        />

        {/* Glow layer */}
        {glowing && (
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 6}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            opacity="0.15"
            filter={`url(#glow-${uniqueId})`}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }}
          />
        )}

        {/* Main arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`url(#grad-${uniqueId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }}
        />

        {/* Tip dot — small luminous circle at the end of the arc */}
        {score > 0 && score < 100 && size >= 48 && (
          <circle
            cx={size / 2 + radius * Math.cos((score / 100) * Math.PI * 2)}
            cy={size / 2 + radius * Math.sin((score / 100) * Math.PI * 2)}
            r={strokeWidth * 0.7}
            fill={color}
            style={{
              filter: `drop-shadow(0 0 4px rgba(${glowColor},0.6))`,
              transition: "all 1.4s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        )}
      </svg>

      {/* Score number */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontSize: size * 0.28,
          fontWeight: 700,
          fontFamily: theme.fontDisplay,
          color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}>
          {score}
        </span>
        {label && (
          <span style={{
            fontSize: Math.max(8, size * 0.1),
            color: theme.textDim,
            fontFamily: theme.fontMono,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop: 2,
          }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
