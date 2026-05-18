// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const express = require("express");
const { generateAuditFix } = require("../services/audit");
const { isAIEnabled } = require("../services/ai");

const router = express.Router();

router.post("/fix", async (req, res) => {
  if (!isAIEnabled()) {
    return res.status(503).json({ error: "AI features disabled — set ANTHROPIC_API_KEY in your environment to enable" });
  }

  const { url, checks, pageContext } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid url" });
  }
  if (!checks || !Array.isArray(checks) || checks.length === 0) {
    return res.status(400).json({ error: "Missing or invalid checks array" });
  }

  try {
    const safeContext = {
      ...pageContext,
      html_snippet: pageContext?.html_snippet ? pageContext.html_snippet.slice(0, 3000) : undefined,
    };

    const result = await generateAuditFix({ url, checks, pageContext: safeContext });

    if (result.error) {
      const status = result.error.includes("timed out") ? 504 : 502;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error("Audit fix error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
