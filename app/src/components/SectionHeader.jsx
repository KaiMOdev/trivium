// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../config/theme";

export default function SectionHeader({ title, subtitle, icon }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon && <span style={{ fontSize: 20 }} aria-hidden="true">{icon}</span>}
        <h2 style={{
          fontFamily: theme.fontDisplay,
          fontSize: 22,
          fontWeight: 700,
          color: theme.text,
          margin: 0,
          letterSpacing: "-0.02em",
        }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{
          color: theme.textMuted,
          fontSize: 13,
          margin: icon ? "8px 0 0 30px" : "8px 0 0 0",
          lineHeight: 1.6,
          fontWeight: 400,
        }}>{subtitle}</p>
      )}
    </div>
  );
}
