// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const { AI_AUDIT_FIX_MAX_TOKENS, AI_AUDIT_FIX_BATCH_MAX_TOKENS, AI_AUDIT_FIX_TEMPERATURE, AI_AUDIT_FIX_MAX_CHECKS } = require("../config/ai");
const { callClaude } = require("./ai");

const SYSTEM_PROMPT = `You are an expert SEO, marketing, and web optimization consultant. Given a page URL, its detected platform/CMS, and specific failing audit checks, generate actionable fix instructions.

For each check, provide:
- "check": the check label (exactly as given)
- "category": the check category (exactly as given)
- "severity": "fail" if score < 45, "warn" if score 45-74
- "problem": 1-2 sentences explaining what's wrong, specific to THIS page (reference the actual values/content found)
- "howToFix": step-by-step instructions. If a CMS is detected, give CMS-specific steps (e.g., WordPress admin panel instructions, Shopify theme editor steps). Otherwise give generic HTML/code instructions.
- "fixContent": ready-to-copy text, code, or markup that fixes the issue. This must be specific to the page content, not generic placeholder text.
- "estimatedImpact": "high" (score < 30 or critical check), "medium" (score 30-60), "low" (score > 60)

Respond with valid JSON only: { "todos": [...] }
Do not wrap in markdown fences.`;

function buildUserPrompt(url, checks, pageContext) {
  const checksText = checks.map(c =>
    `- [${c.category.toUpperCase()}] ${c.label}: score ${c.score}/100 — ${c.detail}`
  ).join("\n");

  let context = `Page URL: ${url}\nPage title: ${pageContext.title || "Unknown"}`;
  if (pageContext.platform?.cms) {
    context += `\nDetected CMS: ${pageContext.platform.cms}`;
    if (pageContext.platform.version) context += ` v${pageContext.platform.version}`;
  }
  if (pageContext.html_snippet) {
    const snippet = pageContext.html_snippet.slice(0, 3000);
    context += `\n\nRelevant HTML:\n${snippet}`;
  }

  return `${context}\n\nFailing checks:\n${checksText}\n\nGenerate a fix TODO for each check listed above.`;
}

async function generateAuditFix({ url, checks, pageContext }) {
  const isBatch = checks.length > 1;
  const maxTokens = isBatch ? AI_AUDIT_FIX_BATCH_MAX_TOKENS : AI_AUDIT_FIX_MAX_TOKENS;

  // Cap batch to top N checks by severity (lowest score first)
  const limitedChecks = [...checks]
    .sort((a, b) => a.score - b.score)
    .slice(0, AI_AUDIT_FIX_MAX_CHECKS);

  try {
    const response = await callClaude({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(url, limitedChecks, pageContext) }],
      maxTokens,
      temperature: AI_AUDIT_FIX_TEMPERATURE,
    });

    let text = (response.content[0]?.text || "").trim();
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();

    const parsed = JSON.parse(text);

    if (!parsed.todos || !Array.isArray(parsed.todos)) {
      return { error: "AI returned an unexpected response format." };
    }

    // Sanitize output
    const todos = parsed.todos.map(todo => ({
      check: String(todo.check || "").slice(0, 200),
      category: String(todo.category || "").slice(0, 50),
      severity: ["fail", "warn"].includes(todo.severity) ? todo.severity : "warn",
      problem: String(todo.problem || "").slice(0, 1000),
      howToFix: String(todo.howToFix || "").slice(0, 2000),
      fixContent: String(todo.fixContent || "").slice(0, 5000),
      estimatedImpact: ["high", "medium", "low"].includes(todo.estimatedImpact) ? todo.estimatedImpact : "medium",
    }));

    return { todos };
  } catch (err) {
    if (err.message?.includes("cost cap")) {
      return { error: "Daily AI cost cap reached. Try again tomorrow." };
    }
    if (err.message?.includes("ANTHROPIC_API_KEY")) {
      return { error: "AI service not configured (missing API key)." };
    }
    return { error: "AI service temporarily unavailable. Please try again." };
  }
}

module.exports = { generateAuditFix, buildUserPrompt };
