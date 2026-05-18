// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../../config/theme";

export default function AccountPage({ onBack }) {
  return (
    <div style={{
      maxWidth: 720, margin: "40px auto", padding: 32,
      background: theme.surface, borderRadius: 16,
      border: `1px solid ${theme.cardBorder}`, color: theme.text,
      fontFamily: theme.fontBody,
    }}>
      <h2 style={{ fontFamily: theme.fontHeading, fontSize: 24, marginBottom: 16 }}>
        Self-hosted mode
      </h2>
      <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: 12 }}>
        This is the open-source build. There is no user account to manage.
      </p>
      <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: 12 }}>
        To enable AI features, set <code style={{ background: theme.bg, padding: "2px 6px", borderRadius: 4 }}>ANTHROPIC_API_KEY</code> in <code style={{ background: theme.bg, padding: "2px 6px", borderRadius: 4 }}>api/.env</code>.
      </p>
      <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: 24 }}>
        To connect Google Search Console, GA4, Adobe Analytics, or Meta Business, configure OAuth credentials in <code style={{ background: theme.bg, padding: "2px 6px", borderRadius: 4 }}>api/.env</code> — see <code style={{ background: theme.bg, padding: "2px 6px", borderRadius: 4 }}>SETUP.md</code>.
      </p>
      <button
        onClick={onBack}
        style={{
          background: theme.accent, color: theme.bg, border: "none",
          padding: "10px 20px", borderRadius: 8, cursor: "pointer",
          fontFamily: theme.fontBody, fontWeight: 600,
        }}
      >
        Back to scanner
      </button>
    </div>
  );
}
