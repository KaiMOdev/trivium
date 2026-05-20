// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS build: there are no tiers. These exports exist so existing UI code
// that calls `tierAtLeast(...)` or reads `TIER_FEATURES[tier]` / `TIERS[tier]`
// keeps working without surgery. Every lookup returns a neutral, permissive shape.

const NEUTRAL_BADGE = {
  bg: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.1)",
  color: "#9aa3b2",
  icon: "◎",
  label: "OSS",
};

export const TIERS = {
  free: NEUTRAL_BADGE,
  pro: NEUTRAL_BADGE,
  premium: NEUTRAL_BADGE,
};

export const tierOrder = ["free", "pro", "premium"];

// Every check is visible and every limit is permissive in the OSS build.
// Keys must cover every `features.*` lookup in the UI, or reads return
// `undefined` (e.g. `Math.min(undefined, n)` → NaN → empty check lists).
const OSS_FEATURES = {
  pageLimit: 200,
  aiEnabled: false,
  exportPdf: true,
  competitors: 10,
  llmChecks: Infinity,
  marketingChecks: Infinity,
  scansPerMonth: -1,
  pages: "Homepage",
  marketing: true,
};

export const TIER_FEATURES = {
  free: OSS_FEATURES,
  pro: OSS_FEATURES,
  premium: OSS_FEATURES,
};

// In OSS, every comparison succeeds: the user is "premium-equivalent".
export function tierAtLeast() {
  return true;
}
