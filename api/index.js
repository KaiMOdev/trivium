// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const { fetchPage, fetchRobotsTxt, parsePage, loadHtml, fetchSitemap, discoverPages } = require("./crawler");
const { createCheckExistsCache } = require("./utils/fetch-helpers");
const { runSeoChecks } = require("./checks/seo");
const { runLlmChecks } = require("./checks/llm");
const { runMarketingChecks } = require("./checks/marketing");
const { runPerformanceChecks } = require("./checks/performance");
const { detectCMS } = require("./plugins/detect");
const { analyzeWordPress } = require("./plugins/wordpress");
const { analyzeShopify } = require("./plugins/shopify");
const { analyzeAEM } = require("./plugins/aem");
const { analyzeReadability } = require("./utils/readability");
const { detectPageType } = require("./utils/pageType");
const { debug } = require("./utils/debug");
const { fetchTextFile, checkExists } = require("./utils/fetch-helpers");
const { getPageLimit, CONCURRENCY, CRAWL_DELAY_MS, getAuditPageLimit, getAuditDepthLimit } = require("./config/tiers");

const app = express();

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SCAN_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many scan requests — please try again in a minute" },
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : true,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "app", "dist")));
}

async function scanUrl(targetUrl, { siteContext, checkUrlExists } = {}) {
  const origin = new URL(targetUrl).origin;

  const [pageResult, robotsTxt, performanceResult, llmsTxt] = await Promise.all([
    fetchPage(targetUrl),
    fetchRobotsTxt(origin),
    runPerformanceChecks(targetUrl),
    fetchTextFile(origin + "/llms.txt"),
  ]);

  const pageData = parsePage(pageResult.html, targetUrl);
  const $ = loadHtml(pageResult.html);

  let faviconExists = false;
  if (pageData.linkIcons && pageData.linkIcons.length === 0) {
    const faviconResult = await checkExists(origin + "/favicon.ico");
    faviconExists = faviconResult.exists;
  } else {
    faviconExists = true;
  }

  pageData.llmsTxt = llmsTxt;
  pageData.faviconExists = faviconExists;
  pageData.redirectChain = pageResult.redirectChain || [];
  pageData.pageType = detectPageType(pageData);

  const quickPlatform = await detectCMS($, origin, { probe: false });

  const seoResults = await runSeoChecks(pageData, robotsTxt, siteContext, { checkUrlExists });
  const llmResults = runLlmChecks(pageData, robotsTxt);
  const marketingResults = runMarketingChecks(pageData);

  debug("scanUrl", "quickPlatform.cms:", quickPlatform.cms);
  const [platform, wordpress, shopify, aem] = await Promise.all([
    quickPlatform.cms && quickPlatform.cms.confidence < 80
      ? detectCMS($, origin)
      : quickPlatform,
    analyzeWordPress(origin, quickPlatform),
    analyzeShopify(origin, quickPlatform, $),
    analyzeAEM(origin, quickPlatform, $),
  ]);

  debug("scanUrl", "shopify result:", shopify ? "available" : shopify);

  const SEO_WEIGHTS = {
    "Title Tag": 3, "Meta Description": 3, "H1 Tag": 3,
    "SSL Certificate": 3, "Meta Robots": 3, "Mobile Viewport": 3,
    "Heading Hierarchy": 2, "Image Alt Tags": 2, "JSON-LD Schema": 2,
    "robots.txt": 2, "Content Depth": 2, "Internal Linking": 2,
    "HTML Lang Attribute": 2, "URL Cleanliness": 2, "Semantic HTML": 2,
    "Canonical URL": 1, "Open Graph Tags": 1, "Schema Completeness": 1,
    "Hreflang Tags": 1, "Content-to-Code Ratio": 1,
    "Breadcrumb Schema": 1, "Sitemap in robots.txt": 1, "Title / H1 Uniqueness": 1,
    "Redirect Chain": 2, "Modern Image Formats": 1, "Responsive Images": 1,
    "Schema Currency": 2, "Mixed Content": 3, "Favicon & Icons": 1,
    "AI Content Quality": 2,
    "Sitemap Freshness": 1,
    "Review Schema Integrity": 3,
  };
  const LLM_WEIGHTS = {
    "Content Clarity": 3, "Answer Capsules": 3,
    "Content Extractability": 2, "Citation Worthiness": 2,
    "Entity Recognition": 2, "FAQ Presence": 2,
    "WebSite / WebPage Schema": 2,
    "Author & Expertise": 1, "Source Attribution": 1,
    "Answer Density": 1,
    "Content Readability": 2, "Sentence Complexity": 1,
    "Speakable Schema": 1, "HowTo Schema": 1,
    "AI Bot Access (Detailed)": 3, "Content Freshness": 2,
    "llms.txt File": 1, "Content Accessibility": 2,
    "Question Headings": 1, "Source Citations": 1, "Definition Clarity": 1,
  };
  const MARKETING_WEIGHTS = {
    "Value Proposition": 3, "CTA Effectiveness": 3,
    "Trust Signals": 2, "Social Proof": 2, "Contact Visibility": 2,
    "Image Lazy Loading": 2,
    "Reviews & Ratings": 1, "Video Content": 1,
    "Privacy & Security": 1, "Content Structure Consistency": 1,
    "Font Display": 1, "Preconnect Hints": 1, "Accessibility Landmarks": 1,
    "CTA Above Fold": 2, "CTA Copy Quality": 1, "Form Optimization": 1,
    "Trust Near CTAs": 1, "Logo Detection": 1, "Typography Quality": 1, "Color Contrast": 1,
    "Benefit vs. Feature Language": 2, "Urgency & Scarcity": 1,
    "Emotional Trigger Words": 1, "Headline Formula Quality": 2,
    "Above-Fold Messaging": 3, "Social Proof Signals": 2,
  };

  const weightedScore = (arr, weights) => {
    const filtered = arr.filter(r => r.status !== "na" && r.score != null);
    if (filtered.length === 0) return 0;
    let totalWeight = 0;
    let weightedSum = 0;
    for (const r of filtered) {
      const w = weights[r.label] || 1;
      weightedSum += r.score * w;
      totalWeight += w;
    }
    return Math.round(weightedSum / totalWeight);
  };

  const deriveMaturityLevel = (seoScore, llmScore, mktScore) => {
    const avg = (seoScore + llmScore + mktScore) / 3;
    if (avg >= 80) return "advanced";
    if (avg >= 55) return "intermediate";
    return "basic";
  };

  return {
    url: targetUrl,
    finalUrl: pageResult.finalUrl,
    scannedAt: new Date().toISOString(),
    scores: {
      seo: weightedScore(seoResults, SEO_WEIGHTS),
      llm: weightedScore(llmResults, LLM_WEIGHTS),
      marketing: weightedScore(marketingResults, MARKETING_WEIGHTS),
      performance: performanceResult.score,
    },
    seo: seoResults,
    llm: llmResults,
    marketing: marketingResults,
    performance: performanceResult,
    platform,
    wordpress,
    shopify,
    aem,
    readability: (() => {
      const visibleText = pageData.visibleText || "";
      return visibleText.length > 100 ? analyzeReadability(visibleText) : null;
    })(),
    meta: {
      title: pageData.title,
      description: pageData.metaDescription,
      images: pageData.images,
      links: pageData.links,
      hasHttps: pageData.isHttps,
    },
    maturityLevel: deriveMaturityLevel(
      weightedScore(seoResults, SEO_WEIGHTS),
      weightedScore(llmResults, LLM_WEIGHTS),
      weightedScore(marketingResults, MARKETING_WEIGHTS)
    ),
  };
}

function normalizeUrl(raw) {
  if (!raw || typeof raw !== "string") throw new Error("url is required");
  if (raw.length > 2048) throw new Error("URL too long (max 2048 characters)");
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const parsed = new URL(u);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }
  return u;
}

function friendlyError(err, targetUrl) {
  if (err.name === "AbortError") return "Request timed out — site took too long to respond";
  if (err.cause?.code === "ENOTFOUND") {
    try { return `DNS lookup failed — could not resolve ${new URL(targetUrl).hostname}`; }
    catch { return "DNS lookup failed"; }
  }
  if (err.cause?.code === "ECONNREFUSED") return "Connection refused — site is not responding";
  return err.message || "Failed to scan site";
}

app.post("/api/scan", scanLimiter, async (req, res) => {
  let targetUrl;
  try {
    targetUrl = normalizeUrl(req.body.url);
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    const result = await scanUrl(targetUrl);
    res.json(result);
  } catch (err) {
    const status = err.cause?.code === "ENOTFOUND" ? 422 : 502;
    res.status(status).json({ error: friendlyError(err, targetUrl) });
  }
});

app.post("/api/scan/compare", scanLimiter, async (req, res) => {
  const { url, competitors } = req.body;

  let targetUrl;
  try {
    targetUrl = normalizeUrl(url);
  } catch {
    return res.status(400).json({ error: "Invalid primary URL" });
  }

  if (!Array.isArray(competitors) || competitors.length === 0) {
    return res.status(400).json({ error: "competitors array is required" });
  }
  if (competitors.length > 10) {
    return res.status(400).json({ error: "Maximum 10 competitors allowed" });
  }

  let competitorUrls;
  try {
    competitorUrls = competitors.map((c) => normalizeUrl(c));
  } catch {
    return res.status(400).json({ error: "One or more competitor URLs are invalid" });
  }

  const allUrls = [targetUrl, ...competitorUrls];
  const checkUrlExists = createCheckExistsCache();

  const settled = await Promise.allSettled(
    allUrls.map((u) => scanUrl(u, { checkUrlExists }))
  );

  const results = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    return { url: allUrls[i], error: friendlyError(s.reason, allUrls[i]) };
  });

  res.json({
    primary: results[0],
    competitors: results.slice(1),
    comparedAt: new Date().toISOString(),
  });
});

async function withConcurrency(items, limit, fn) {
  const results = [];
  const executing = new Set();
  for (let i = 0; i < items.length; i++) {
    const p = fn(items[i], i).then((r) => { executing.delete(p); return r; });
    executing.add(p);
    results.push(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

app.post("/api/scan/site", scanLimiter, async (req, res) => {
  let targetUrl;
  try {
    targetUrl = normalizeUrl(req.body.url);
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  const maxPages = getPageLimit();
  const requestedLimit = parseInt(req.body.pageLimit, 10);
  const pageLimit = (requestedLimit > 0 && requestedLimit <= maxPages) ? requestedLimit : maxPages;

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (obj) => {
    try { res.write(JSON.stringify(obj) + "\n"); } catch { /* client disconnected */ }
  };

  let aborted = false;
  res.on("close", () => { if (!res.writableFinished) aborted = true; });

  const SCAN_TIMEOUT_MS = Math.max(60_000, Math.min(300_000, 30_000 + pageLimit * 3_000));
  const scanTimeout = setTimeout(() => {
    if (!aborted) {
      aborted = true;
      send({ type: "error", message: `Scan timed out after ${Math.round(SCAN_TIMEOUT_MS / 60000)} minutes. Try scanning fewer pages.` });
      res.end();
    }
  }, SCAN_TIMEOUT_MS);

  try {
    send({ type: "status", message: "Discovering pages...", pageLimit });

    const siteOrigin = new URL(targetUrl).origin;
    const [pages, sitemap] = await Promise.all([
      discoverPages(targetUrl, pageLimit),
      fetchSitemap(siteOrigin),
    ]);
    const siteContext = {
      sitemapUrls: sitemap.urls,
      sitemapLastmodMap: sitemap.lastmodMap,
      discoveredUrls: pages,
    };

    send({ type: "discovery", total: pages.length, urls: pages });

    const pageResults = [];
    let completedCount = 0;
    const checkUrlExists = createCheckExistsCache();

    await withConcurrency(pages, CONCURRENCY, async (pageUrl, index) => {
      if (aborted) return null;
      if (index > 0) await new Promise((r) => setTimeout(r, CRAWL_DELAY_MS));

      try {
        const result = await scanUrl(pageUrl, { siteContext, checkUrlExists });
        completedCount++;
        send({
          type: "page",
          index,
          completed: completedCount,
          total: pages.length,
          url: pageUrl,
          result,
        });
        pageResults.push(result);
      } catch (err) {
        completedCount++;
        const errorResult = { url: pageUrl, error: friendlyError(err, pageUrl) };
        send({
          type: "page",
          index,
          completed: completedCount,
          total: pages.length,
          url: pageUrl,
          error: errorResult.error,
        });
        pageResults.push(errorResult);
      }
    });

    const successful = pageResults.filter((r) => !r.error);
    const avgScore = (key) => {
      const scores = successful.map((r) => r.scores?.[key]).filter((s) => typeof s === "number");
      return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    };

    const issueMap = {};
    for (const r of successful) {
      for (const check of [...(r.seo || []), ...(r.llm || []), ...(r.marketing || [])]) {
        if (check.score != null && check.status !== "na" && check.score < 50) {
          if (!issueMap[check.label]) {
            issueMap[check.label] = { detail: check.detail || "", pages: [], category: check.category || "" };
          }
          issueMap[check.label].pages.push({ url: r.url, score: check.score, detail: check.detail || "" });
        }
      }
    }
    const commonIssues = Object.entries(issueMap)
      .filter(([, data]) => data.pages.length > 1)
      .sort((a, b) => b[1].pages.length - a[1].pages.length)
      .map(([label, data]) => ({
        label,
        affectedPages: data.pages.length,
        totalPages: successful.length,
        detail: data.detail,
        pages: data.pages,
      }));

    send({
      type: "complete",
      aggregate: {
        scores: {
          seo: avgScore("seo"),
          llm: avgScore("llm"),
          marketing: avgScore("marketing"),
          performance: avgScore("performance"),
        },
        pagesScanned: successful.length,
        pagesFailed: pageResults.length - successful.length,
        pagesTotal: pages.length,
        commonIssues,
      },
      primary: pageResults.find((r) => r.url === targetUrl) || pageResults[0],
      primaryUrl: targetUrl,
    });
  } catch (err) {
    send({ type: "error", message: friendlyError(err, targetUrl) });
  }

  clearTimeout(scanTimeout);
  if (!aborted) res.end();
});

app.post("/api/audit/discover", scanLimiter, async (req, res) => {
  let targetUrl;
  try {
    targetUrl = normalizeUrl(req.body.url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const validatePatterns = (arr, name) => {
    if (arr === undefined || arr === null) return [];
    if (!Array.isArray(arr)) return { error: `${name} must be an array` };
    if (arr.length > 10) return { error: `${name} allows max 10 patterns` };
    for (const p of arr) {
      if (typeof p !== "string") return { error: `${name} patterns must be strings` };
      if (p.length > 200) return { error: `${name} pattern too long (max 200 chars)` };
      if (!p.startsWith("/")) return { error: `${name} patterns must start with /` };
    }
    return arr;
  };

  const includePaths = validatePatterns(req.body.includePaths, "includePaths");
  if (includePaths.error) return res.status(400).json({ error: includePaths.error });
  const excludePaths = validatePatterns(req.body.excludePaths, "excludePaths");
  if (excludePaths.error) return res.status(400).json({ error: excludePaths.error });

  const depthLimit = getAuditDepthLimit();
  const requestedDepth = parseInt(req.body.maxDepth);
  const maxDepth = isNaN(requestedDepth) ? depthLimit : Math.min(requestedDepth, depthLimit);
  const pageLimit = getAuditPageLimit();

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  let aborted = false;
  res.on("close", () => { aborted = true; });
  const send = (obj) => { if (!aborted) res.write(JSON.stringify(obj) + "\n"); };

  send({ type: "status", message: "Starting page audit...", pageLimit });

  try {
    const userId = OSS_USER_ID;
    const auditOrigin = new URL(targetUrl).origin;
    const [pages, auditSitemap] = await Promise.all([
      discoverPages(targetUrl, pageLimit, maxDepth, { includePaths, excludePaths }),
      fetchSitemap(auditOrigin),
    ]);
    const siteContext = {
      sitemapUrls: auditSitemap.urls,
      sitemapLastmodMap: auditSitemap.lastmodMap,
      discoveredUrls: pages,
    };
    send({ type: "discovery", total: pages.length, urls: pages });

    const allResults = [];
    let completed = 0;
    const checkUrlExists = createCheckExistsCache();

    await withConcurrency(pages, CONCURRENCY, async (pageUrl, index) => {
      if (aborted) return;
      if (index > 0) await new Promise((r) => setTimeout(r, CRAWL_DELAY_MS));
      try {
        const result = await scanUrl(pageUrl, { siteContext, checkUrlExists });
        completed++;
        allResults.push(result);
        send({ type: "page", index, completed, total: pages.length, url: pageUrl, result });
      } catch (err) {
        completed++;
        send({ type: "page", index, completed, total: pages.length, url: pageUrl, error: err.message });
      }
    });

    const cats = ["seo", "llm", "marketing", "performance"];
    const aggregate = { scores: {} };
    for (const cat of cats) {
      const vals = allResults.map(r => r.scores?.[cat]).filter(v => typeof v === "number");
      aggregate.scores[cat] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }

    const primary = allResults.find(r =>
      normalizeUrl(r.url) === targetUrl || normalizeUrl(r.finalUrl) === targetUrl
    ) || allResults[0];

    send({ type: "complete", aggregate, primary, primaryUrl: targetUrl });
  } catch (err) {
    send({ type: "error", message: err.message });
  }

  if (!aborted) res.end();
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
  });
});

if (process.env.NODE_ENV === "production") {
  app.get("{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "app", "dist", "index.html"));
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://0.0.0.0:${PORT}`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[Server] Port ${PORT} is already in use.`);
  } else {
    console.error("[Server] Failed to start:", err.message);
  }
  process.exit(1);
});

async function gracefulShutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log("[Server] All connections closed. Exiting.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[Server] Forced shutdown after timeout.");
    process.exit(1);
  }, 30_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
