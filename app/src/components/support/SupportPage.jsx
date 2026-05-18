// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../../config/theme";

export default function SupportPage({ onBack }) {
  return (
    <div style={{
      maxWidth: 720, margin: "40px auto", padding: 32,
      background: theme.surface, borderRadius: 16,
      border: `1px solid ${theme.cardBorder}`, color: theme.text,
      fontFamily: theme.fontBody,
    }}>
      <h2 style={{ fontFamily: theme.fontHeading, fontSize: 24, marginBottom: 16 }}>
        Need help?
      </h2>
      <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: 12 }}>
        This is the open-source build. Support is community-driven:
      </p>
      <ul style={{ color: theme.textMuted, lineHeight: 1.8, marginBottom: 24, paddingLeft: 24 }}>
        <li>Read <code style={{ background: theme.bg, padding: "2px 6px", borderRadius: 4 }}>README.md</code> and <code style={{ background: theme.bg, padding: "2px 6px", borderRadius: 4 }}>SETUP.md</code></li>
        <li>Open a GitHub Issue for bug reports or feature requests</li>
        <li>Check existing issues and discussions before posting</li>
      </ul>
      <button
        onClick={onBack}
        style={{
          background: theme.accent, color: theme.bg, border: "none",
          padding: "10px 20px", borderRadius: 8, cursor: "pointer",
          fontFamily: theme.fontBody, fontWeight: 600,
        }}
      >
        Back
      </button>
    </div>
  );
}
