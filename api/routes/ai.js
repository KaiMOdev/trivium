// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const express = require("express");
const { generateFixSuggestion, generateAuditSummary, isAIEnabled } = require("../services/ai");

const VALID_INDUSTRIES = new Set(["ecommerce", "saas", "agency", "healthcare", "restaurant", "real-estate", "education", "news-media", "finance", "legal", "travel", "manufacturing", "nonprofit", "entertainment", "other"]);
const VALID_BUSINESS_MODELS = new Set(["b2b", "b2c", "marketplace", "nonprofit", "personal", "other"]);
const VALID_SITE_PURPOSES = new Set(["sell-products", "generate-leads", "inform-educate", "provide-service", "entertain", "build-community", "other"]);

function sanitizeClassification(raw) {
  if (!raw || typeof raw !== "object") return null;
  const industry = VALID_INDUSTRIES.has(raw.industry) ? raw.industry : null;
  const businessModel = VALID_BUSINESS_MODELS.has(raw.businessModel) ? raw.businessModel : null;
  const sitePurpose = VALID_SITE_PURPOSES.has(raw.sitePurpose) ? raw.sitePurpose : null;
  if (!industry && !businessModel && !sitePurpose) return null;
  return { industry: industry || "other", businessModel: businessModel || "other", sitePurpose: sitePurpose || "other" };
}

function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function requireAI(_req, res, next) {
  if (!isAIEnabled()) {
    return res.status(503).json({ error: "AI features disabled — set ANTHROPIC_API_KEY in your environment to enable" });
  }
  next();
}

const router = express.Router();

router.post("/suggestions", requireAI, async (req, res) => {
  try {
    const { check, meta } = req.body;
    const classification = sanitizeClassification(req.body.classification);

    if (!check?.label || typeof check.label !== "string" || !meta?.url || typeof meta.url !== "string") {
      return res.status(400).json({ error: "check.label and meta.url are required strings" });
    }
    if (!isValidHttpUrl(meta.url)) {
      return res.status(400).json({ error: "meta.url must be a valid http(s) URL" });
    }
    if (typeof check.score !== "number" || check.score < 0 || check.score > 100) {
      return res.status(400).json({ error: "check.score must be a number between 0 and 100" });
    }
    if (check.detail && typeof check.detail !== "string") {
      return res.status(400).json({ error: "check.detail must be a string" });
    }

    const result = await generateFixSuggestion(check, meta, classification);
    if (result.error) {
      const status = result.error.includes("not configured") ? 503 : 500;
      return res.status(status).json({ error: result.error });
    }
    res.json({ suggestions: result.suggestions || [] });
  } catch (err) {
    console.error("[AI Route] Unhandled error:", err.message);
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/summary", requireAI, async (req, res) => {
  try {
    const { scores, checks, meta } = req.body;
    const classification = sanitizeClassification(req.body.classification);

    if (!scores || typeof scores !== "object" || !meta?.url || typeof meta.url !== "string") {
      return res.status(400).json({ error: "scores (object) and meta.url (string) are required" });
    }
    if (!isValidHttpUrl(meta.url)) {
      return res.status(400).json({ error: "meta.url must be a valid http(s) URL" });
    }
    for (const key of ["seo", "llm", "marketing"]) {
      if (scores[key] !== undefined && (typeof scores[key] !== "number" || scores[key] < 0 || scores[key] > 100)) {
        return res.status(400).json({ error: `scores.${key} must be a number between 0 and 100` });
      }
    }
    if (checks && typeof checks === "object") {
      for (const cat of ["seo", "llm", "marketing"]) {
        if (checks[cat] && (!Array.isArray(checks[cat]) || checks[cat].length > 50)) {
          return res.status(400).json({ error: `checks.${cat} must be an array with at most 50 items` });
        }
      }
    }

    const worstChecks = {};
    const bestChecks = {};
    for (const cat of ["seo", "llm", "marketing"]) {
      const arr = checks?.[cat] || [];
      const sorted = [...arr].sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
      worstChecks[cat] = sorted.slice(0, 5).map(c => ({ label: c.label, score: c.score, detail: c.detail }));
      bestChecks[cat] = sorted.reverse().slice(0, 3).map(c => ({ label: c.label, score: c.score, detail: c.detail }));
    }

    const result = await generateAuditSummary(scores, worstChecks, meta, bestChecks, classification);
    if (result.error) {
      const status = result.error.includes("not configured") ? 503 : 500;
      return res.status(status).json({ error: result.error });
    }
    res.json({ summary: result });
  } catch (err) {
    console.error("[AI Route] Summary error:", err.message);
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

module.exports = router;
