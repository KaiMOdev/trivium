// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Fetch real Core Web Vitals & performance metrics via
 * Google PageSpeed Insights API (free, no API key required).
 */

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function fetchPerformanceMetrics(url) {
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });

  const apiKey = process.env.PSI_API_KEY;
  if (apiKey) {
    params.set("key", apiKey);
  }

  const res = await fetch(`${PSI_API}?${params}`, {
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason = body.error?.errors?.[0]?.reason;
    if (res.status === 429 || reason === "rateLimitExceeded") {
      throw new Error(
        "PageSpeed Insights rate limit reached. Set PSI_API_KEY env var with a Google Cloud API key for higher quotas."
      );
    }
    throw new Error(
      `PageSpeed Insights error (${res.status}): ${body.error?.message || "Unknown error"}`
    );
  }

  return res.json();
}

function extractMetrics(psiData) {
  const audits = psiData.lighthouseResult?.audits ?? {};
  const categories = psiData.lighthouseResult?.categories ?? {};
  const fieldData = psiData.loadingExperience?.metrics ?? {};

  // Lighthouse lab metrics
  const lcp = audits["largest-contentful-paint"];
  const cls = audits["cumulative-layout-shift"];
  const tbt = audits["total-blocking-time"]; // proxy for FID in lab
  const fcp = audits["first-contentful-paint"];
  const si = audits["speed-index"];
  const tti = audits["interactive"];

  // Overall performance score (0-100)
  const perfScore = Math.round((categories.performance?.score ?? 0) * 100);

  // Field data (real-user metrics from CrUX, may not exist for low-traffic sites)
  const fieldLcp = fieldData.LARGEST_CONTENTFUL_PAINT_MS;
  const fieldCls = fieldData.CUMULATIVE_LAYOUT_SHIFT_SCORE;
  const fieldFid = fieldData.FIRST_INPUT_DELAY_MS;
  const fieldInp = fieldData.INTERACTION_TO_NEXT_PAINT;

  const metrics = [];

  // LCP
  const lcpValue = fieldLcp?.percentile ?? lcp?.numericValue;
  if (lcpValue != null) {
    const lcpSec = lcpValue / 1000;
    const lcpScore = lcpSec <= 2.5 ? 90 + Math.round(10 * (1 - lcpSec / 2.5))
      : lcpSec <= 4.0 ? 50 + Math.round(40 * (1 - (lcpSec - 2.5) / 1.5))
      : Math.max(0, Math.round(50 * (1 - (lcpSec - 4.0) / 4.0)));
    metrics.push({
      label: "LCP",
      fullName: "Largest Contentful Paint",
      value: `${lcpSec.toFixed(1)}s`,
      rawValue: lcpSec,
      target: "< 2.5s",
      score: Math.min(100, Math.max(0, lcpScore)),
      detail: lcpSec <= 2.5 ? "Good — main content loads quickly"
        : lcpSec <= 4.0 ? "Needs improvement — main content is slow to appear"
        : "Poor — users wait too long to see content",
      source: fieldLcp ? "field" : "lab",
      minTier: "free",
    });
  }

  // FID / INP (field) or TBT (lab proxy)
  if (fieldInp) {
    const inpMs = fieldInp.percentile;
    const inpScore = inpMs <= 200 ? 90 + Math.round(10 * (1 - inpMs / 200))
      : inpMs <= 500 ? 50 + Math.round(40 * (1 - (inpMs - 200) / 300))
      : Math.max(0, Math.round(50 * (1 - (inpMs - 500) / 500)));
    metrics.push({
      label: "INP",
      fullName: "Interaction to Next Paint",
      value: `${inpMs}ms`,
      rawValue: inpMs,
      target: "< 200ms",
      score: Math.min(100, Math.max(0, inpScore)),
      detail: inpMs <= 200 ? "Good — interactions feel responsive"
        : inpMs <= 500 ? "Needs improvement — some interactions feel sluggish"
        : "Poor — interactions are noticeably delayed",
      source: "field",
      minTier: "free",
    });
  } else if (fieldFid) {
    const fidMs = fieldFid.percentile;
    const fidScore = fidMs <= 100 ? 90 + Math.round(10 * (1 - fidMs / 100))
      : fidMs <= 300 ? 50 + Math.round(40 * (1 - (fidMs - 100) / 200))
      : Math.max(0, Math.round(50 * (1 - (fidMs - 300) / 300)));
    metrics.push({
      label: "FID",
      fullName: "First Input Delay",
      value: `${fidMs}ms`,
      rawValue: fidMs,
      target: "< 100ms",
      score: Math.min(100, Math.max(0, fidScore)),
      detail: fidMs <= 100 ? "Good — page responds to input quickly"
        : fidMs <= 300 ? "Needs improvement — noticeable delay on first interaction"
        : "Poor — significant delay before page responds",
      source: "field",
      minTier: "free",
    });
  } else if (tbt?.numericValue != null) {
    const tbtMs = Math.round(tbt.numericValue);
    const tbtScore = tbtMs <= 200 ? 90 + Math.round(10 * (1 - tbtMs / 200))
      : tbtMs <= 600 ? 50 + Math.round(40 * (1 - (tbtMs - 200) / 400))
      : Math.max(0, Math.round(50 * (1 - (tbtMs - 600) / 600)));
    metrics.push({
      label: "TBT",
      fullName: "Total Blocking Time",
      value: `${tbtMs}ms`,
      rawValue: tbtMs,
      target: "< 200ms",
      score: Math.min(100, Math.max(0, tbtScore)),
      detail: tbtMs <= 200 ? "Good — minimal main-thread blocking"
        : tbtMs <= 600 ? "Needs improvement — main thread is partially blocked"
        : "Poor — heavy main-thread blocking hurts interactivity",
      source: "lab",
      minTier: "free",
    });
  }

  // CLS
  const clsValue = fieldCls?.percentile != null
    ? fieldCls.percentile / 100  // CrUX returns CLS * 100
    : cls?.numericValue;
  if (clsValue != null) {
    const clsScore = clsValue <= 0.1 ? 90 + Math.round(10 * (1 - clsValue / 0.1))
      : clsValue <= 0.25 ? 50 + Math.round(40 * (1 - (clsValue - 0.1) / 0.15))
      : Math.max(0, Math.round(50 * (1 - (clsValue - 0.25) / 0.25)));
    metrics.push({
      label: "CLS",
      fullName: "Cumulative Layout Shift",
      value: clsValue.toFixed(2),
      rawValue: clsValue,
      target: "< 0.1",
      score: Math.min(100, Math.max(0, clsScore)),
      detail: clsValue <= 0.1 ? "Good — layout is visually stable"
        : clsValue <= 0.25 ? "Needs improvement — some layout shifting detected"
        : "Poor — significant layout shifts hurt user experience",
      source: fieldCls ? "field" : "lab",
      minTier: "pro",
    });
  }

  // FCP
  if (fcp?.numericValue != null) {
    const fcpSec = fcp.numericValue / 1000;
    const fcpScore = fcpSec <= 1.8 ? 90 + Math.round(10 * (1 - fcpSec / 1.8))
      : fcpSec <= 3.0 ? 50 + Math.round(40 * (1 - (fcpSec - 1.8) / 1.2))
      : Math.max(0, Math.round(50 * (1 - (fcpSec - 3.0) / 3.0)));
    metrics.push({
      label: "FCP",
      fullName: "First Contentful Paint",
      value: `${fcpSec.toFixed(1)}s`,
      rawValue: fcpSec,
      target: "< 1.8s",
      score: Math.min(100, Math.max(0, fcpScore)),
      detail: fcpSec <= 1.8 ? "Good — first content appears quickly"
        : fcpSec <= 3.0 ? "Needs improvement — users see a blank screen too long"
        : "Poor — very slow initial render",
      source: "lab",
      minTier: "pro",
    });
  }

  // Speed Index
  if (si?.numericValue != null) {
    const siSec = si.numericValue / 1000;
    const siScore = siSec <= 3.4 ? 90 + Math.round(10 * (1 - siSec / 3.4))
      : siSec <= 5.8 ? 50 + Math.round(40 * (1 - (siSec - 3.4) / 2.4))
      : Math.max(0, Math.round(50 * (1 - (siSec - 5.8) / 5.8)));
    metrics.push({
      label: "SI",
      fullName: "Speed Index",
      value: `${siSec.toFixed(1)}s`,
      rawValue: siSec,
      target: "< 3.4s",
      score: Math.min(100, Math.max(0, siScore)),
      detail: siSec <= 3.4 ? "Good — page visually completes quickly"
        : siSec <= 5.8 ? "Needs improvement — visual loading is sluggish"
        : "Poor — page content loads very slowly",
      source: "lab",
      minTier: "premium",
    });
  }

  // TTI
  if (tti?.numericValue != null) {
    const ttiSec = tti.numericValue / 1000;
    const ttiScore = ttiSec <= 3.8 ? 90 + Math.round(10 * (1 - ttiSec / 3.8))
      : ttiSec <= 7.3 ? 50 + Math.round(40 * (1 - (ttiSec - 3.8) / 3.5))
      : Math.max(0, Math.round(50 * (1 - (ttiSec - 7.3) / 7.3)));
    metrics.push({
      label: "TTI",
      fullName: "Time to Interactive",
      value: `${ttiSec.toFixed(1)}s`,
      rawValue: ttiSec,
      target: "< 3.8s",
      score: Math.min(100, Math.max(0, ttiScore)),
      detail: ttiSec <= 3.8 ? "Good — page becomes interactive quickly"
        : ttiSec <= 7.3 ? "Needs improvement — takes a while before users can interact"
        : "Poor — very long wait before page is usable",
      source: "lab",
      minTier: "premium",
    });
  }

  // Extract key optimization opportunities from Lighthouse
  const opportunities = [];
  const oppAudits = [
    "render-blocking-resources",
    "unused-css-rules",
    "unused-javascript",
    "modern-image-formats",
    "uses-optimized-images",
    "uses-text-compression",
    "uses-responsive-images",
    "efficient-animated-content",
    "server-response-time",
  ];

  for (const id of oppAudits) {
    const audit = audits[id];
    if (audit && audit.score !== null && audit.score < 1) {
      const savings = audit.details?.overallSavingsMs;
      opportunities.push({
        title: audit.title,
        description: audit.description?.split("[")[0]?.trim() || audit.title,
        savingsMs: savings ?? 0,
        score: Math.round((audit.score ?? 0) * 100),
      });
    }
  }

  opportunities.sort((a, b) => b.savingsMs - a.savingsMs);

  return {
    score: perfScore,
    metrics,
    opportunities: opportunities.slice(0, 5),
    strategy: "mobile",
  };
}

/**
 * Run performance checks. Returns { score, metrics, opportunities, strategy }.
 * On failure, returns a degraded result with score 0 so the scan doesn't break.
 */
async function runPerformanceChecks(url) {
  try {
    const psiData = await fetchPerformanceMetrics(url);
    return extractMetrics(psiData);
  } catch (err) {
    console.error("Performance check failed:", err.message);
    return {
      score: 0,
      metrics: [],
      opportunities: [],
      strategy: "mobile",
      error: err.message,
    };
  }
}

module.exports = { runPerformanceChecks };
