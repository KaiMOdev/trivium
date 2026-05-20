// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { describe, test, expect } from "vitest";
import { theme, FONTS_CSS } from "../config/theme";
import { TIER_FEATURES } from "../config/tiers";

describe("theme", () => {
  test("has all required color properties", () => {
    const requiredKeys = [
      "bg", "surface", "card", "cardBorder",
      "accent", "accentDim", "accentGlow",
      "warning", "danger", "info",
      "text", "textMuted", "textDim",
    ];
    requiredKeys.forEach((key) => {
      expect(theme).toHaveProperty(key);
      expect(typeof theme[key]).toBe("string");
    });
  });

  test("FONTS_CSS contains Google Fonts import", () => {
    expect(FONTS_CSS).toContain("fonts.googleapis.com");
  });
});

describe("TIER_FEATURES", () => {
  test("every tier exposes all keys the UI reads", () => {
    // SiteAuditApp reads each of these; a missing key resolves to
    // `undefined` and silently empties the AI Search / Marketing tabs
    // (Math.min(undefined, n) -> NaN -> slice(0, NaN) -> []).
    const requiredKeys = [
      "pageLimit", "competitors", "llmChecks", "marketingChecks",
      "scansPerMonth", "pages", "marketing",
    ];
    for (const tier of ["free", "pro", "premium"]) {
      for (const key of requiredKeys) {
        expect(TIER_FEATURES[tier]).toHaveProperty(key);
        expect(TIER_FEATURES[tier][key]).not.toBeUndefined();
      }
    }
  });
});
