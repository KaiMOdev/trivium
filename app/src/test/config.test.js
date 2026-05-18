// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { describe, test, expect } from "vitest";
import { theme, FONTS_CSS } from "../config/theme";

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
