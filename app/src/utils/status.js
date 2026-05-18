// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Derive a status string from an item's explicit status or numeric score.
 * Thresholds: pass >= 75, warn >= 45, fail < 45
 */
export function getStatus(item) {
  if (item.status) return item.status;
  return item.score >= 75 ? "pass" : item.score >= 45 ? "warn" : "fail";
}
