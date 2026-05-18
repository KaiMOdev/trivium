// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS build: there are no tiers. Every feature is available.
// These exports exist so existing UI code that calls `tierAtLeast(...)` or reads
// `TIER_FEATURES[tier]` keeps working without surgery.

export const TIERS = { FREE: "free", PRO: "pro", PREMIUM: "premium" };

export const tierOrder = ["free", "pro", "premium"];

export const TIER_FEATURES = {
  free:    { pageLimit: 200, aiEnabled: true, exportPdf: true, competitors: 10 },
  pro:     { pageLimit: 200, aiEnabled: true, exportPdf: true, competitors: 10 },
  premium: { pageLimit: 200, aiEnabled: true, exportPdf: true, competitors: 10 },
};

// In OSS, every comparison succeeds: the user is "premium-equivalent".
export function tierAtLeast() {
  return true;
}
