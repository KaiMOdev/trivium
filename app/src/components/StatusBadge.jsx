// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../config/theme";

export default function StatusBadge({ status }) {
  const colors = {
    pass: { bg: theme.accentGlow, text: theme.accent },
    warn: { bg: theme.warningGlow, text: theme.warning },
    fail: { bg: theme.dangerGlow, text: theme.danger },
    na: { bg: "rgba(142,155,178,0.1)", text: theme.textMuted },
  };
  const validStatus = colors[status] ? status : "warn";
  const c = colors[validStatus];
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      padding: "3px 10px",
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      fontFamily: theme.fontMono,
    }}>{validStatus === "na" ? "N/A" : validStatus}</span>
  );
}
