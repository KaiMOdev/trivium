// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { describe, test, expect } from "vitest";
import { theme, FONTS_CSS } from "../config/theme";
import { TIERS, TIER_FEATURES, tierOrder, tierAtLeast, integrations } from "../config/tiers";

describe("theme", () => {
  test("has all required color properties", () => {
    const requiredKeys = [
      "bg", "surface", "card", "cardBorder",
      "accent", "accentDim", "accentGlow",
      "warning", "danger", "info",
      "text", "textMuted", "textDim",
      "pro", "proGlow", "proBorder",
      "premium", "premiumGlow", "premiumBorder",
    ];
    requiredKeys.forEach((key) => {
      expect(theme).toHaveProperty(key);
      expect(typeof theme[key]).toBe("string");
    });
  });

  test("FONTS_CSS contains Google Fonts import", () => {
    expect(FONTS_CSS).toContain("fonts.googleapis.com");
    expect(FONTS_CSS).toContain("Syne");
    expect(FONTS_CSS).toContain("Outfit");
    expect(FONTS_CSS).toContain("Fira+Code");
  });
});

describe("tiers", () => {
  test("TIERS has free, pro, premium", () => {
    expect(TIERS).toHaveProperty("free");
    expect(TIERS).toHaveProperty("pro");
    expect(TIERS).toHaveProperty("premium");
  });

  test("each tier has label, color, bg, border, icon", () => {
    Object.values(TIERS).forEach((tier) => {
      expect(tier).toHaveProperty("label");
      expect(tier).toHaveProperty("color");
      expect(tier).toHaveProperty("bg");
      expect(tier).toHaveProperty("border");
      expect(tier).toHaveProperty("icon");
    });
  });

  test("TIER_FEATURES has all three tiers", () => {
    expect(TIER_FEATURES).toHaveProperty("free");
    expect(TIER_FEATURES).toHaveProperty("pro");
    expect(TIER_FEATURES).toHaveProperty("premium");
  });

  test("free tier has restricted features", () => {
    const f = TIER_FEATURES.free;
    expect(f.llm).toBe(true);
    expect(f.marketing).toBe(true);
    expect(f.seoChecks).toBe(5);
    expect(f.scansPerMonth).toBe(3);
    expect(f.export).toBe(false);
  });

  test("pro tier unlocks LLM and marketing", () => {
    const p = TIER_FEATURES.pro;
    expect(p.llm).toBe(true);
    expect(p.marketing).toBe(true);
    expect(p.seoChecks).toBe(999);
  });

  test("premium tier has max features", () => {
    const p = TIER_FEATURES.premium;
    expect(p.scansPerMonth).toBe(-1); // unlimited
    expect(p.scheduling).toBe(true);
    expect(p.whiteLabel).toBe(true);
    expect(p.apiAccess).toBe(true);
    expect(p.competitors).toBe(10);
  });
});

describe("tierAtLeast", () => {
  test("free is at least free", () => {
    expect(tierAtLeast("free", "free")).toBe(true);
  });

  test("free is NOT at least pro", () => {
    expect(tierAtLeast("free", "pro")).toBe(false);
  });

  test("pro is at least pro", () => {
    expect(tierAtLeast("pro", "pro")).toBe(true);
  });

  test("pro is at least free", () => {
    expect(tierAtLeast("pro", "free")).toBe(true);
  });

  test("pro is NOT at least premium", () => {
    expect(tierAtLeast("pro", "premium")).toBe(false);
  });

  test("premium is at least everything", () => {
    expect(tierAtLeast("premium", "free")).toBe(true);
    expect(tierAtLeast("premium", "pro")).toBe(true);
    expect(tierAtLeast("premium", "premium")).toBe(true);
  });
});

describe("tierOrder", () => {
  test("is [free, pro, premium]", () => {
    expect(tierOrder).toEqual(["free", "pro", "premium"]);
  });
});

describe("integrations", () => {
  test("has 8 integrations", () => {
    expect(integrations).toHaveLength(8);
  });

  test("each integration has required fields", () => {
    integrations.forEach((int) => {
      expect(int).toHaveProperty("id");
      expect(int).toHaveProperty("name");
      expect(int).toHaveProperty("icon");
      expect(int).toHaveProperty("minTier");
      expect(int).toHaveProperty("desc");
      expect(["pro", "premium"]).toContain(int.minTier);
    });
  });

  test("pro integrations include gsc, wp, and aem", () => {
    const proInts = integrations.filter((i) => i.minTier === "pro");
    const ids = proInts.map((i) => i.id);
    expect(ids).toContain("gsc");
    expect(ids).toContain("wp");
    expect(ids).toContain("aem");
  });
});
