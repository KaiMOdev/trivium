// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
export const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap');
`;

export const theme = {
  // Backgrounds — deep void with subtle chromatic shifts
  bg: "#06080C",
  bgGradient: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,245,212,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(167,119,255,0.03) 0%, transparent 50%), #06080C",
  surface: "#0D1017",
  surfaceHover: "#131720",
  card: "#0F1319",
  cardBorder: "#1A1F2E",
  cardBorderHover: "#2A3045",

  // Primary — bioluminescent teal
  accent: "#00F5D4",
  accentDim: "#00C4AA",
  accentMuted: "#009E88",
  accentGlow: "rgba(0,245,212,0.10)",
  accentGlowStrong: "rgba(0,245,212,0.18)",

  // Secondary — electric violet
  violet: "#A777FF",
  violetDim: "#8B5CF6",
  violetGlow: "rgba(167,119,255,0.10)",

  // Semantic
  warning: "#FFB224",
  warningGlow: "rgba(255,178,36,0.10)",
  danger: "#FF4D6A",
  dangerGlow: "rgba(255,77,106,0.10)",
  info: "#5B8DEF",
  infoGlow: "rgba(91,141,239,0.10)",

  // Text
  text: "#E4E8F1",
  textMuted: "#8E9BB2",
  textDim: "#5E6D85",

  // Tier colors
  pro: "#A777FF",
  proGlow: "rgba(167,119,255,0.10)",
  proBorder: "rgba(167,119,255,0.25)",
  premium: "#FFD666",
  premiumGlow: "rgba(255,214,102,0.10)",
  premiumBorder: "rgba(255,214,102,0.25)",

  // Fonts
  fontDisplay: "'Syne', sans-serif",
  fontBody: "'Outfit', sans-serif",
  fontMono: "'Fira Code', monospace",

  // Effects
  glassLight: "rgba(255,255,255,0.02)",
  glassBorder: "rgba(255,255,255,0.06)",
  grainOpacity: 0.035,
};
