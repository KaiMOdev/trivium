// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../config/theme";

export default function PricingModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.surface, border: `1px solid ${theme.cardBorder}`,
          borderRadius: 16, padding: 32, maxWidth: 480, color: theme.text,
          fontFamily: theme.fontBody,
        }}
      >
        <h2 style={{ fontFamily: theme.fontHeading, fontSize: 22, marginBottom: 12 }}>
          You're running the open-source build
        </h2>
        <p style={{ color: theme.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          Every check in this build is deterministic and free — no paid tiers, no third-party AI calls.
        </p>
        <p style={{ color: theme.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
          AI-powered narrative summaries and per-check fix suggestions are part of the hosted commercial product at <a href="https://siteauditpro.online" target="_blank" rel="noopener noreferrer" style={{ color: theme.accent }}>siteauditpro.online</a>.
        </p>
        <button
          onClick={onClose}
          style={{
            background: theme.accent, color: theme.bg, border: "none",
            padding: "10px 20px", borderRadius: 8, cursor: "pointer",
            fontFamily: theme.fontBody, fontWeight: 600,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
