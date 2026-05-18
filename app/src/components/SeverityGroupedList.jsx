// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState } from "react";
import { theme } from "../config/theme";
import { getStatus } from "../utils/status";
import UpgradeBanner from "./UpgradeBanner";

const SEVERITY_ORDER = ["fail", "warn", "pass", "na"];
const FREE_MAX_FAILS = 1;

const SEVERITY_META = {
  fail: { label: "Needs Fixing", icon: "✕", color: theme.danger, glow: theme.dangerGlow },
  warn: { label: "Can Improve", icon: "◐", color: theme.warning, glow: theme.warningGlow },
  pass: { label: "Looking Good", icon: "✓", color: theme.accent, glow: theme.accentGlow },
  na: { label: "Not Applicable", icon: "—", color: theme.textMuted, glow: "rgba(142,155,178,0.08)" },
};

function GroupHeader({ severity, count }) {
  const meta = SEVERITY_META[severity];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 8px",
      marginTop: 4,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 11, fontWeight: 800,
        background: meta.glow, color: meta.color, border: `1px solid ${meta.color}22`,
      }}>{meta.icon}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, fontFamily: theme.fontDisplay,
        color: meta.color, letterSpacing: "0.03em",
      }}>{meta.label}</span>
      <span style={{
        fontSize: 10, fontFamily: theme.fontMono, color: theme.textMuted,
        background: theme.surface, padding: "2px 8px", borderRadius: 6,
        border: `1px solid ${theme.cardBorder}`,
      }}>{count}</span>
    </div>
  );
}

/**
 * Groups items by severity and renders them with headers.
 *
 * @param {Object[]} items - Check items to render
 * @param {Function} renderItem - (item, key, index, blurred) => JSX
 * @param {boolean} [gateFails=false] - Whether to blur extra fail items (free tier)
 * @param {Object} [wrapItemsStyle] - Optional style for wrapping items per severity group (e.g. grid container)
 */
export default function SeverityGroupedList({ items, renderItem, gateFails = false, wrapItemsStyle }) {
  const [naExpanded, setNaExpanded] = useState(false);
  const groups = { fail: [], warn: [], pass: [], na: [] };
  items.forEach((item) => {
    if (!item) return;
    groups[getStatus(item)].push(item);
  });

  // Pre-compute running indices keyed by severity+position to avoid stale object refs
  const indexMap = new Map();
  let idx = 0;
  SEVERITY_ORDER.forEach((sev) => {
    groups[sev].forEach((item, i) => { indexMap.set(`${sev}-${i}`, idx++); });
  });

  return (<>
    {SEVERITY_ORDER.map((sev) => {
      if (groups[sev].length === 0) return null;

      // Special rendering for N/A section (collapsed by default)
      if (sev === "na") {
        return (
          <div key="na">
            <button onClick={() => setNaExpanded(!naExpanded)} style={{
              background: "transparent", border: "none", color: theme.textMuted,
              cursor: "pointer", fontSize: "0.8rem", padding: "8px 0", display: "flex", alignItems: "center", gap: 4,
              width: "100%", textAlign: "left",
            }}>
              <span style={{ transform: naExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▼</span>
              Not Applicable ({groups[sev].length})
            </button>
            {naExpanded && groups[sev].map((item, i) => renderItem(item, `na-${i}`, indexMap.get(`na-${i}`), false))}
          </div>
        );
      }

      const capFails = gateFails && sev === "fail";
      const shown = capFails ? groups[sev].slice(0, FREE_MAX_FAILS) : groups[sev];
      const blurred = capFails ? groups[sev].slice(FREE_MAX_FAILS) : [];

      const renderedItems = (
        <>
          {shown.map((item, i) => renderItem(item, `${sev}-${i}`, indexMap.get(`${sev}-${i}`), false))}
          {blurred.map((item, i) => renderItem(item, `${sev}-b-${i}`, indexMap.get(`${sev}-${shown.length + i}`), true))}
        </>
      );

      return (
        <div key={sev}>
          <GroupHeader severity={sev} count={groups[sev].length} />
          {wrapItemsStyle ? <div style={wrapItemsStyle}>{renderedItems}</div> : renderedItems}
          {blurred.length > 0 && (
            <UpgradeBanner requiredTier="pro" compact
              featureDesc={`${blurred.length} more critical issue${blurred.length > 1 ? "s" : ""} found — upgrade to see all fixes`} />
          )}
        </div>
      );
    })}
  </>);
}
