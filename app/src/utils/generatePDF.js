// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { jsPDF } from "jspdf";
import explanations from "../config/explanations";

// â”€â”€ Print-friendly light palette â”€â”€
const C = {
  bg: "#FFFFFF",
  surface: "#F5F6F8",
  accent: "#0A8A6E",
  violet: "#7B5EC6",
  warning: "#C07800",
  danger: "#CC2244",
  text: "#1A1D23",
  textMuted: "#4A5568",
  textDim: "#7A8599",
  border: "#D8DCE4",
  pass: "#0A8A6E",
  warn: "#C07800",
  fail: "#CC2244",
  white: "#FFFFFF",
  premium: "#B8860B",
  pro: "#7B5EC6",
  blue: "#2B6CB0",
  shopify: "#96BF48",
};

function scoreColor(score) {
  if (score >= 75) return C.pass;
  if (score >= 45) return C.warn;
  return C.fail;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function setColor(doc, hex) {
  doc.setTextColor(...hexToRgb(hex));
}

function drawRect(doc, x, y, w, h, hex) {
  doc.setFillColor(...hexToRgb(hex));
  doc.rect(x, y, w, h, "F");
}

function drawRoundedRect(doc, x, y, w, h, r, hex) {
  doc.setFillColor(...hexToRgb(hex));
  doc.roundedRect(x, y, w, h, r, r, "F");
}

function drawLine(doc, x1, y1, x2, y2, hex, width = 0.3) {
  doc.setDrawColor(...hexToRgb(hex));
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}

// â”€â”€ Score ring (simplified arc for PDF) â”€â”€
function drawScoreCircle(doc, cx, cy, radius, score) {
  const color = scoreColor(score);

  // Track circle
  doc.setDrawColor(...hexToRgb(C.border));
  doc.setLineWidth(1.5);
  doc.circle(cx, cy, radius, "S");

  // Score arc
  if (score > 0) {
    const segments = Math.round(score * 0.64);
    const angleStep = (2 * Math.PI * (score / 100)) / Math.max(segments, 1);
    const startAngle = -Math.PI / 2;
    doc.setDrawColor(...hexToRgb(color));
    doc.setLineWidth(2);
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + i * angleStep;
      const a2 = startAngle + (i + 1) * angleStep;
      doc.line(
        cx + radius * Math.cos(a1),
        cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2),
        cy + radius * Math.sin(a2)
      );
    }
  }

  // Score text
  setColor(doc, color);
  doc.setFontSize(radius * 1.6);
  doc.setFont("helvetica", "bold");
  doc.text(String(score), cx, cy + radius * 0.5, { align: "center" });
}

// â”€â”€ Section header helper â”€â”€
function drawSectionHeader(doc, title, color, y, margin, pageW, ensureSpace) {
  y += 6;
  y = ensureSpace(y, 22);
  setColor(doc, color);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 3;
  drawLine(doc, margin, y, pageW - margin, y, color, 0.5);
  y += 6;
  return y;
}

// â”€â”€ Draw a data table â”€â”€
function drawDataTable(doc, headers, rows, y, margin, pageW, contentW, ensureSpace, options = {}) {
  const { colWidths, headerColor = C.textDim, rowColor = C.text, fontSize = 7 } = options;
  const colCount = headers.length;
  const defaultColW = contentW / colCount;
  const widths = colWidths || headers.map(() => defaultColW);

  // Header row
  y = ensureSpace(y, 10);
  drawRoundedRect(doc, margin, y - 3, contentW, 8, 2, C.surface);
  setColor(doc, headerColor);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  let hx = margin + 4;
  headers.forEach((h, i) => {
    if (i === 0) {
      doc.text(h, hx, y + 1.5);
    } else {
      doc.text(h, hx + widths[i] / 2, y + 1.5, { align: "center" });
    }
    hx += widths[i];
  });
  y += 8;

  // Data rows
  rows.forEach((row) => {
    y = ensureSpace(y, 6);
    let rx = margin + 4;
    row.forEach((cell, i) => {
      const val = String(cell ?? "â€”");
      setColor(doc, i === 0 ? rowColor : C.textMuted);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", i === 0 ? "normal" : "normal");
      if (i === 0) {
        const truncated = val.length > 45 ? val.slice(0, 42) + "..." : val;
        doc.text(truncated, rx, y);
      } else {
        doc.text(val, rx + widths[i] / 2, y, { align: "center" });
      }
      rx += widths[i];
    });
    y += 5;
    drawLine(doc, margin + 2, y - 1.5, pageW - margin - 2, y - 1.5, C.border, 0.1);
  });

  y += 3;
  return y;
}

// â”€â”€ Render a single check row with expert info â”€â”€
function drawCheckRow(doc, check, y, margin, pageW, contentW, ensureSpace, showExpertInfo) {
  const rowHeight = estimateCheckRowHeight(doc, check, contentW, showExpertInfo);
  y = ensureSpace(y, rowHeight);

  const status = check.status || (check.score >= 75 ? "pass" : check.score >= 45 ? "warn" : "fail");
  const sColor = status === "pass" ? C.pass : status === "warn" ? C.warn : C.fail;

  // Colored status bullet
  doc.setFillColor(...hexToRgb(sColor));
  doc.circle(margin + 6, y - 1, 1.5, "F");

  // Label
  setColor(doc, C.text);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(check.label, margin + 11, y);

  // Page URL (for multi-page context)
  if (check.pageUrl) {
    setColor(doc, C.textDim);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    let displayUrl;
    try { displayUrl = new URL(check.pageUrl).pathname || "/"; } catch { displayUrl = check.pageUrl; }
    doc.text(displayUrl, margin + 11 + doc.getTextWidth(check.label + "  "), y - 0.5);
  }

  // Score (right-aligned)
  setColor(doc, sColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(String(check.score), pageW - margin - 4, y, { align: "right" });

  // Detail
  if (check.detail) {
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const maxDetailW = contentW - 30;
    const detailLines = doc.splitTextToSize(check.detail, maxDetailW);
    doc.text(detailLines.slice(0, 2), margin + 11, y + 4);
    y += 4 + Math.min(detailLines.length, 2) * 3;
  } else {
    y += 4;
  }

  // Items (specific findings)
  if (check.items?.length > 0) {
    const maxItems = 5;
    const visibleItems = check.items.slice(0, maxItems);
    visibleItems.forEach((item) => {
      y = ensureSpace(y, 4);
      setColor(doc, C.textDim);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      const itemText = item.length > 90 ? item.slice(0, 87) + "..." : item;
      doc.text(`â€º  ${itemText}`, margin + 14, y);
      y += 3.2;
    });
    if (check.items.length > maxItems) {
      setColor(doc, C.textDim);
      doc.setFontSize(5.5);
      doc.text(`+${check.items.length - maxItems} more...`, margin + 14, y);
      y += 3;
    }
  }

  // Expert info (why + how to fix)
  if (showExpertInfo) {
    const exp = explanations[check.label];
    if (exp) {
      y += 1;
      // Why it matters
      if (exp.why) {
        y = ensureSpace(y, 12);
        setColor(doc, C.textMuted);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const whyLines = doc.splitTextToSize(exp.why, contentW - 30);
        const visibleWhyLines = whyLines.slice(0, 3);
        const boxH = 6 + visibleWhyLines.length * 2.8;
        drawRoundedRect(doc, margin + 10, y - 2, contentW - 14, boxH, 1, C.surface);
        setColor(doc, C.accent);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("Why it matters:", margin + 12, y + 1);
        y += 4;
        setColor(doc, C.textMuted);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(visibleWhyLines, margin + 12, y);
        y += visibleWhyLines.length * 2.8;
      }
      // How to fix (only show for checks that need improvement)
      if (exp.howToFix?.length > 0 && (check.score == null || check.score < 75)) {
        y += 1;
        y = ensureSpace(y, 10);
        setColor(doc, C.accent);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("How to fix:", margin + 12, y + 1);
        y += 4;
        setColor(doc, C.textMuted);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        exp.howToFix.slice(0, 3).forEach((step) => {
          y = ensureSpace(y, 4);
          const stepLines = doc.splitTextToSize(`â€¢ ${step}`, contentW - 32);
          doc.text(stepLines.slice(0, 1), margin + 12, y);
          y += stepLines.length > 0 ? 3 : 2.5;
        });
      }
    }
  }

  y += 2;
  drawLine(doc, margin + 4, y, pageW - margin - 4, y, C.border, 0.15);
  y += 3;

  return y;
}

function estimateCheckRowHeight(doc, check, contentW, showExpertInfo) {
  let h = 12; // base height
  if (check.detail) {
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(check.detail, contentW - 30);
    h += Math.min(lines.length, 2) * 3;
  }
  if (check.items?.length > 0) {
    h += Math.min(check.items.length, 5) * 3.2;
    if (check.items.length > 5) h += 3;
  }
  if (showExpertInfo) {
    const exp = explanations[check.label];
    if (exp) {
      if (exp.why) h += 14;
      if (exp.howToFix?.length > 0) h += 4 + Math.min(exp.howToFix.length, 3) * 3;
    }
  }
  return h;
}

// â”€â”€ Draw a section of checks â”€â”€
function drawCheckSection(doc, title, titleColor, checks, y, margin, pageW, contentW, ensureSpace, isFree, showExpertInfo) {
  if (!checks || checks.length === 0) return y;

  y = drawSectionHeader(doc, title, titleColor, y, margin, pageW, ensureSpace);

  // Table header
  drawRoundedRect(doc, margin, y - 3, contentW, 8, 2, C.surface);
  setColor(doc, C.textDim);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CHECK", margin + 11, y + 1.5);
  doc.text("SCORE", pageW - margin - 4, y + 1.5, { align: "right" });

  y += 8;
  const visibleChecks = isFree ? checks.slice(0, 5) : checks;
  visibleChecks.forEach((check) => {
    y = drawCheckRow(doc, check, y, margin, pageW, contentW, ensureSpace, showExpertInfo);
  });

  if (isFree && checks.length > 5) {
    y = ensureSpace(y, 10);
    setColor(doc, C.pro);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`+ ${checks.length - 5} more checks available with Pro`, margin + 4, y);
    y += 8;
  }

  return y;
}

// â”€â”€ Metric cards row (3 per row) â”€â”€
function drawMetricCards(doc, metrics, y, margin, contentW, ensureSpace) {
  const cardW = (contentW - 8) / 3;
  metrics.forEach((m, i) => {
    if (i % 3 === 0 && i > 0) y += 20;
    y = ensureSpace(y, 20);
    const col = i % 3;
    const cx = margin + col * (cardW + 4);
    drawRoundedRect(doc, cx, y, cardW, 16, 2, C.surface);

    const color = m.score != null ? scoreColor(m.score) : C.text;
    setColor(doc, color);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(String(m.value ?? m.score ?? "â€”"), cx + cardW / 2, y + 7, { align: "center" });

    setColor(doc, C.textMuted);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(m.label, cx + cardW / 2, y + 12.5, { align: "center" });
  });
  y += 20;
  return y;
}

// â”€â”€ Key-value info list â”€â”€
function drawInfoList(doc, items, y, margin, ensureSpace) {
  items.filter(Boolean).forEach((line) => {
    y = ensureSpace(y, 6);
    setColor(doc, C.text);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(line, margin + 4, y);
    y += 5;
  });
  return y;
}

// â”€â”€ Executive Summary builder â”€â”€
function normalizeComparableUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return String(value).replace(/\/+$/, "");
  }
}

export function getReportScoreSet(results, siteResults) {
  const isMultiPage = !!siteResults?.pages?.length;
  if (isMultiPage && siteResults?.aggregate?.scores) {
    return siteResults.aggregate.scores;
  }
  return results?.scores || {};
}

export function getReportPrimaryUrl(results, siteResults, fallbackUrl) {
  return siteResults?.primaryUrl || results?.finalUrl || results?.url || fallbackUrl || "â€”";
}

export function getSecondaryPages(results, siteResults) {
  const pages = siteResults?.pages || [];
  if (pages.length <= 1) return [];

  const primaryKey = normalizeComparableUrl(
    siteResults?.primaryUrl || results?.finalUrl || results?.url
  );
  if (!primaryKey) return pages.slice(1);

  const secondaryPages = pages.filter((page) => {
    const pageKey = normalizeComparableUrl(page?.finalUrl || page?.url);
    return pageKey !== primaryKey;
  });

  return secondaryPages.length > 0 ? secondaryPages : pages.slice(1);
}

export function buildExecutiveSummary(results, siteResults, isFree) {
  const scores = getReportScoreSet(results, siteResults);
  const categories = isFree
    ? [{ name: "SEO", score: scores.seo ?? 0 }, { name: "Speed", score: scores.performance ?? 0 }]
    : [
        { name: "SEO", score: scores.seo ?? 0 },
        { name: "AI Search", score: scores.llm ?? 0 },
        { name: "Marketing", score: scores.marketing ?? 0 },
        { name: "Speed", score: scores.performance ?? 0 },
      ];
  const validCats = categories.filter(c => c.score > 0);
  if (validCats.length === 0) return [];

  const overall = Math.round(validCats.reduce((s, c) => s + c.score, 0) / validCats.length);
  const strongest = validCats.reduce((a, b) => a.score >= b.score ? a : b);
  const weakest = validCats.reduce((a, b) => a.score <= b.score ? a : b);
  const spread = strongest.score - weakest.score;

  const lines = [];

  if (spread > 5) {
    lines.push(`Your site scores ${overall} overall, with ${strongest.name} as the strongest area and ${weakest.name} needing the most attention.`);
  } else {
    lines.push(`Your site scores ${overall} overall, with balanced performance across all categories.`);
  }

  const allChecks = [...(results?.seo || []), ...(results?.llm || []), ...(results?.marketing || [])];
  const topPasses = allChecks.filter(c => c.score >= 95 && c.status !== "na").slice(0, 3);
  if (topPasses.length > 0) {
    lines.push(`Key strengths: ${topPasses.map(c => c.label).join(", ")}.`);
  }

  const failing = allChecks.filter(c => c.score < 75 && c.status !== "na").sort((a, b) => a.score - b.score).slice(0, 3);
  if (failing.length > 0) {
    lines.push(`Priority improvements: ${failing.map(c => `${c.label} (${c.score})`).join(", ")}.`);
  } else {
    lines.push("No critical issues found â€” all checks are passing.");
  }

  const isMultiPage = !!siteResults?.pages?.length;
  const commonIssues = siteResults?.aggregate?.commonIssues;
  if (isMultiPage && commonIssues?.length > 0) {
    const worst = commonIssues[0];
    lines.push(`Across ${siteResults.pages.length} pages, the most widespread issue is ${worst.label || worst.check} (avg score ${worst.avgScore}, affecting ${worst.count} pages).`);
  }

  return lines;
}

// â”€â”€ Main export function â”€â”€
export default function generatePDF(results, tier, url, siteResults, aiSummary) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const isFree = tier === "free";
  const isMultiPage = !!siteResults?.pages?.length;
  const reportScores = getReportScoreSet(results, siteResults);
  const reportUrl = getReportPrimaryUrl(results, siteResults, url);
  const seoScore = reportScores.seo ?? 0;
  const llmScore = reportScores.llm ?? 0;
  const mktScore = reportScores.marketing ?? 0;
  const perfScore = reportScores.performance ?? 0;
  const hasPerfData = perfScore > 0;
  const overallScore = isFree
    ? (hasPerfData ? Math.round((seoScore + perfScore) / 2) : seoScore)
    : (hasPerfData
      ? Math.round((seoScore + llmScore + mktScore + perfScore) / 4)
      : Math.round((seoScore + llmScore + mktScore) / 3));

  // â”€â”€ Ensure page space, add new page if needed â”€â”€
  function ensureSpace(currentY, needed) {
    if (currentY + needed > pageH - 18) {
      doc.addPage();
      return margin;
    }
    return currentY;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PAGE 1 â€” Cover / Summary
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Top accent bar
  drawRect(doc, 0, 0, pageW, 2.5, C.accent);

  // Header
  y = 18;
  setColor(doc, C.accent);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Trivium", margin, y);

  // Tier badge
  const tierColor = tier === "premium" ? C.premium : tier === "pro" ? C.pro : C.textMuted;
  const tierLabel = tier.toUpperCase();
  setColor(doc, tierColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(tierLabel, pageW - margin, y, { align: "right" });

  // Subtitle
  y += 6;
  setColor(doc, C.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const subtitle = isMultiPage
    ? `Site-Wide SEO & AI Search Readiness Report Â· ${siteResults.pages.length} pages`
    : "SEO & AI Search Readiness Report";
  doc.text(subtitle, margin, y);

  // Divider
  y += 5;
  drawLine(doc, margin, y, pageW - margin, y, C.border);

  // URL + date row
  y += 8;
  setColor(doc, C.text);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(reportUrl, margin, y);

  y += 5;
  setColor(doc, C.textDim);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const scanDate = results?.scannedAt ? new Date(results.scannedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  }) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Scanned: ${scanDate}`, margin, y);

  // Platform detection
  if (results?.platform?.name) {
    doc.text(`  Â·  Platform: ${results.platform.name}`, margin + doc.getTextWidth(`Scanned: ${scanDate}`), y);
  }

  // â”€â”€ Overall Score Ring â”€â”€
  y += 18;
  drawScoreCircle(doc, pageW / 2, y + 14, 14, overallScore);

  y += 32;
  setColor(doc, C.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("OVERALL SCORE", pageW / 2, y, { align: "center" });

  // â”€â”€ Category score cards â”€â”€
  y += 12;
  const categories = [
    { label: "SEO", score: seoScore },
    ...(isFree ? [] : [
      { label: "AI Search", score: llmScore },
      { label: "Marketing", score: mktScore },
    ]),
    ...(hasPerfData ? [{ label: "Speed", score: perfScore }] : []),
  ];

  const cardW = (contentW - (categories.length - 1) * 6) / categories.length;
  categories.forEach((cat, i) => {
    const cx = margin + i * (cardW + 6);
    drawRoundedRect(doc, cx, y, cardW, 24, 3, C.surface);
    drawLine(doc, cx, y, cx + cardW, y, scoreColor(cat.score), 0.8);

    setColor(doc, scoreColor(cat.score));
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(cat.score), cx + cardW / 2, y + 12, { align: "center" });

    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(cat.label.toUpperCase(), cx + cardW / 2, y + 19, { align: "center" });
  });

  // *** FIX: Advance y past the 24mm-tall category cards ***
  y += 30;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  EXECUTIVE SUMMARY
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const summaryLines = buildExecutiveSummary(results, siteResults, isFree);
  if (summaryLines.length > 0) {
    y += 4;
    y = ensureSpace(y, 30);
    const summaryText = summaryLines.join(" ");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const wrappedLines = doc.splitTextToSize(summaryText, contentW - 16);
    const boxH = 8 + wrappedLines.length * 3.5;
    drawRoundedRect(doc, margin, y - 4, contentW, boxH, 3, C.surface);
    drawRect(doc, margin, y - 4, 3, boxH, C.accent);
    setColor(doc, C.text);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(wrappedLines, margin + 8, y);
    y += boxH + 2;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  TOP 5 PRIORITY FIXES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  {
    const allChecks = [
      ...(results?.seo || []).map(c => ({ ...c, category: "SEO" })),
      ...(results?.llm || []).map(c => ({ ...c, category: "AI Search" })),
      ...(results?.marketing || []).map(c => ({ ...c, category: "Marketing" })),
    ];
    const priorities = allChecks
      .filter(c => c.score < 75 && c.status !== "na")
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    if (priorities.length > 0) {
      y = drawSectionHeader(doc, "Priority Fixes", C.fail, y, margin, pageW, ensureSpace);

      priorities.forEach((check, i) => {
        y = ensureSpace(y, 14);
        const sColor = check.score >= 45 ? C.warn : C.fail;

        setColor(doc, sColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}.`, margin + 2, y);

        setColor(doc, C.text);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text(check.label, margin + 10, y);

        setColor(doc, C.textDim);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(check.category, margin + 10 + doc.getTextWidth(check.label + "  "), y);

        setColor(doc, sColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(String(check.score), pageW - margin - 4, y, { align: "right" });

        if (check.detail) {
          y += 4;
          setColor(doc, C.textMuted);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          const detailLines = doc.splitTextToSize(check.detail, contentW - 20);
          doc.text(detailLines.slice(0, 1), margin + 10, y);
          y += 3.5;
        } else {
          y += 4;
        }

        y += 2;
        drawLine(doc, margin + 4, y, pageW - margin - 4, y, C.border, 0.1);
        y += 3;
      });

      y += 2;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  AI SUMMARY (only if generated)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (aiSummary) {
    y = drawSectionHeader(doc, "AI Analysis Summary", C.violet, y, margin, pageW, ensureSpace);

    // Overall assessment
    if (aiSummary.overall) {
      y = ensureSpace(y, 16);
      drawRoundedRect(doc, margin, y - 3, contentW, 0, 3, "#F3EFFE");
      setColor(doc, C.violet);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Overall Assessment", margin + 4, y + 1);
      y += 5;
      setColor(doc, C.text);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const overallLines = doc.splitTextToSize(aiSummary.overall, contentW - 8);
      overallLines.slice(0, 4).forEach((line) => {
        y = ensureSpace(y, 4);
        doc.text(line, margin + 4, y);
        y += 3.5;
      });
      y += 3;
    }

    // Critical Issues
    if (aiSummary.critical?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.fail);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Critical Issues", margin + 4, y);
      y += 5;
      aiSummary.critical.forEach((item, i) => {
        y = ensureSpace(y, 8);
        setColor(doc, C.text);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(`${i + 1}. ${item}`, contentW - 12);
        lines.slice(0, 3).forEach((line) => {
          doc.text(line, margin + 6, y);
          y += 3.2;
        });
        y += 1;
      });
      y += 2;
    }

    // Quick Wins
    if (aiSummary.quickWins?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.pass);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Quick Wins", margin + 4, y);
      y += 5;
      aiSummary.quickWins.forEach((item) => {
        y = ensureSpace(y, 8);
        setColor(doc, C.text);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(`â€¢ ${item}`, contentW - 12);
        lines.slice(0, 3).forEach((line) => {
          doc.text(line, margin + 6, y);
          y += 3.2;
        });
        y += 1;
      });
      y += 2;
    }

    // Long-term Strategy
    if (aiSummary.longTerm?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.blue);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Long-term Strategy", margin + 4, y);
      y += 5;
      aiSummary.longTerm.forEach((item) => {
        y = ensureSpace(y, 8);
        setColor(doc, C.text);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(`â€¢ ${item}`, contentW - 12);
        lines.slice(0, 3).forEach((line) => {
          doc.text(line, margin + 6, y);
          y += 3.2;
        });
        y += 1;
      });
      y += 2;
    }

    y += 4;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PLATFORM & TECHNOLOGY DETECTION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (results?.platform && (results.platform.cms || results.platform.technologies?.length > 0)) {
    y = drawSectionHeader(doc, "Platform & Technology", C.accent, y, margin, pageW, ensureSpace);

    const plat = results.platform;
    const infoLines = [];
    if (plat.cms) {
      infoLines.push(`CMS: ${plat.cms.name || plat.name || "Unknown"}${plat.cms.confidence ? ` (${plat.cms.confidence}% confidence)` : ""}`);
    } else if (plat.name) {
      infoLines.push(`Platform: ${plat.name}`);
    }
    if (plat.server) infoLines.push(`Server: ${plat.server}`);

    y = drawInfoList(doc, infoLines, y, margin, ensureSpace);

    // Technology badges
    if (plat.technologies?.length > 0) {
      y += 2;
      setColor(doc, C.textDim);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("DETECTED TECHNOLOGIES", margin + 4, y);
      y += 5;

      plat.technologies.forEach((tech) => {
        y = ensureSpace(y, 5);
        setColor(doc, C.text);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const techName = typeof tech === "string" ? tech : tech.name || tech;
        const techCategory = typeof tech === "object" && tech.category ? ` (${tech.category})` : "";
        doc.text(`â€¢  ${techName}${techCategory}`, margin + 6, y);
        y += 4;
      });
    }

    y += 4;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  MULTI-PAGE: Site Overview Summary
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (isMultiPage && siteResults.aggregate) {
    y = drawSectionHeader(doc, "Site Overview", C.accent, y, margin, pageW, ensureSpace);

    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const agg = siteResults.aggregate;
    doc.text(`Pages scanned: ${agg.pagesScanned || siteResults.pages.length}${agg.pagesFailed ? ` Â· ${agg.pagesFailed} failed` : ""}`, margin + 4, y);
    y += 6;

    // Per-page score table
    y = ensureSpace(y, 14);
    drawRoundedRect(doc, margin, y - 3, contentW, 8, 2, C.surface);
    setColor(doc, C.textDim);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("PAGE", margin + 4, y + 1.5);
    doc.text("SEO", pageW - margin - 44, y + 1.5, { align: "center" });
    if (!isFree) {
      doc.text("AI", pageW - margin - 32, y + 1.5, { align: "center" });
      doc.text("MKT", pageW - margin - 20, y + 1.5, { align: "center" });
    }
    doc.text("SPEED", pageW - margin - 6, y + 1.5, { align: "center" });
    y += 8;

    siteResults.pages.forEach((page) => {
      y = ensureSpace(y, 8);
      const isError = !!page.error && !page.scores;
      let displayUrl;
      try { displayUrl = new URL(page.url).pathname || "/"; } catch { displayUrl = page.url || "â€”"; }
      if (displayUrl.length > 50) displayUrl = displayUrl.slice(0, 47) + "...";

      setColor(doc, isError ? C.fail : C.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(displayUrl, margin + 4, y);

      if (isError) {
        setColor(doc, C.fail);
        doc.setFontSize(6);
        doc.text("Error", pageW - margin - 24, y, { align: "center" });
      } else if (page.scores) {
        const ps = page.scores;
        setColor(doc, scoreColor(ps.seo ?? 0));
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(String(ps.seo ?? "â€”"), pageW - margin - 44, y, { align: "center" });
        if (!isFree) {
          setColor(doc, scoreColor(ps.llm ?? 0));
          doc.text(String(ps.llm ?? "â€”"), pageW - margin - 32, y, { align: "center" });
          setColor(doc, scoreColor(ps.marketing ?? 0));
          doc.text(String(ps.marketing ?? "â€”"), pageW - margin - 20, y, { align: "center" });
        }
        setColor(doc, scoreColor(ps.performance ?? 0));
        doc.text(String(ps.performance ?? "â€”"), pageW - margin - 6, y, { align: "center" });
      }

      y += 5;
      drawLine(doc, margin + 2, y - 1, pageW - margin - 2, y - 1, C.border, 0.1);
    });
    y += 4;

    // Common issues across pages
    if (agg.commonIssues?.length > 0) {
      y = ensureSpace(y, 16);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Common Issues Across Pages", margin, y);
      y += 5;

      agg.commonIssues.slice(0, 10).forEach((issue) => {
        y = ensureSpace(y, 8);
        const issColor = scoreColor(issue.avgScore ?? 0);
        doc.setFillColor(...hexToRgb(issColor));
        doc.circle(margin + 4, y - 1, 1.2, "F");

        setColor(doc, C.text);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(issue.label || issue.check || "â€”", margin + 8, y);

        setColor(doc, issColor);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(`${issue.avgScore ?? "â€”"}`, pageW - margin - 18, y, { align: "right" });
        setColor(doc, C.textDim);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(`${issue.count || "â€”"} pages`, pageW - margin - 4, y, { align: "right" });
        y += 5;
      });
      y += 2;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CHECK DETAILS (SEO, AI Search, Marketing)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const seoChecks = results?.seo ?? [];
  const showExpertInfo = true;

  y = drawCheckSection(doc, "SEO Audit", C.accent, seoChecks, y, margin, pageW, contentW, ensureSpace, isFree, showExpertInfo);

  if (!isFree && results?.llm?.length > 0) {
    y = drawCheckSection(doc, "AI Search Readiness", C.violet, results.llm, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
  }

  if (!isFree && results?.marketing?.length > 0) {
    y = drawCheckSection(doc, "Marketing Effectiveness", C.warning, results.marketing, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PERFORMANCE / CORE WEB VITALS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (hasPerfData && results?.performance?.metrics?.length > 0) {
    y = drawSectionHeader(doc, "Performance & Core Web Vitals", C.accent, y, margin, pageW, ensureSpace);

    const metrics = results.performance.metrics.filter(m => {
      if (isFree) return !m.minTier || m.minTier === "free";
      if (tier === "pro") return !m.minTier || m.minTier !== "premium";
      return true;
    });

    y = drawMetricCards(doc, metrics, y, margin, contentW, ensureSpace);

    // Expert info for performance metrics
    y += 2;
    metrics.forEach((m) => {
      const exp = explanations[m.label];
      if (!exp) return;
      y = ensureSpace(y, 14);
      setColor(doc, C.text);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(m.label, margin + 4, y);
      setColor(doc, scoreColor(m.score));
      doc.setFontSize(7);
      doc.text(` (${m.value || m.score})`, margin + 4 + doc.getTextWidth(m.label + " "), y);
      y += 3.5;

      if (exp.why) {
        setColor(doc, C.textMuted);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const whyLines = doc.splitTextToSize(exp.why, contentW - 14);
        doc.text(whyLines.slice(0, 2), margin + 6, y);
        y += Math.min(whyLines.length, 2) * 2.8 + 1;
      }

      if (exp.howToFix?.length > 0) {
        setColor(doc, C.textDim);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        exp.howToFix.slice(0, 2).forEach((step) => {
          y = ensureSpace(y, 4);
          doc.text(`â€¢ ${step}`, margin + 6, y);
          y += 2.8;
        });
      }
      y += 2;
      drawLine(doc, margin + 4, y, pageW - margin - 4, y, C.border, 0.1);
      y += 3;
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PER-PAGE CHECK DETAILS (multi-page)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (isMultiPage && siteResults?.pages?.length > 1) {
    const pagesWithIssues = getSecondaryPages(results, siteResults).filter(page => {
      if (!page.seo && !page.llm && !page.marketing) return false;
      const allPageChecks = [...(page.seo || []), ...(page.llm || []), ...(page.marketing || [])];
      return allPageChecks.some(c => c.score < 75 && c.status !== "na");
    });

    if (pagesWithIssues.length > 0) {
      y = drawSectionHeader(doc, "Page-Level Issues", C.accent, y, margin, pageW, ensureSpace);

      pagesWithIssues.forEach((page) => {
        const allPageChecks = [...(page.seo || []), ...(page.llm || []), ...(page.marketing || [])];
        const issues = allPageChecks
          .filter(c => c.score < 75 && c.status !== "na")
          .sort((a, b) => a.score - b.score)
          .slice(0, 5);

        if (issues.length === 0) return;

        y = ensureSpace(y, 16);
        let displayUrl;
        try { displayUrl = new URL(page.url).pathname || "/"; } catch { displayUrl = page.url || "â€”"; }
        if (displayUrl.length > 60) displayUrl = displayUrl.slice(0, 57) + "...";

        setColor(doc, C.text);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(displayUrl, margin + 4, y);

        if (page.scores) {
          const pageOverall = Math.round(
            ((page.scores.seo || 0) + (page.scores.llm || 0) + (page.scores.marketing || 0)) / 3
          );
          setColor(doc, scoreColor(pageOverall));
          doc.setFontSize(8);
          doc.text(String(pageOverall), pageW - margin - 4, y, { align: "right" });
        }
        y += 5;

        issues.forEach((check) => {
          y = ensureSpace(y, 10);
          const sColor = check.score >= 45 ? C.warn : C.fail;

          doc.setFillColor(...hexToRgb(sColor));
          doc.circle(margin + 8, y - 1, 1, "F");

          setColor(doc, C.text);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(check.label, margin + 12, y);

          setColor(doc, sColor);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.text(String(check.score), pageW - margin - 4, y, { align: "right" });

          if (check.detail) {
            y += 3;
            setColor(doc, C.textDim);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            const detailLines = doc.splitTextToSize(check.detail, contentW - 24);
            doc.text(detailLines.slice(0, 1), margin + 12, y);
          }

          y += 4;
        });

        y += 2;
        drawLine(doc, margin + 4, y, pageW - margin - 4, y, C.border, 0.2);
        y += 4;
      });
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  GOOGLE SEARCH CONSOLE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (results?.gsc?.available) {
    const gsc = results.gsc;
    y = drawSectionHeader(doc, "Google Search Console", C.accent, y, margin, pageW, ensureSpace);

    // Overview metrics
    if (gsc.performance) {
      const perf = gsc.performance;
      const gscMetrics = [
        { label: "Impressions", value: (perf.impressions ?? 0).toLocaleString() },
        { label: "Clicks", value: (perf.clicks ?? 0).toLocaleString() },
        { label: "CTR", value: `${(perf.ctr ?? 0).toFixed(1)}%` },
        { label: "Avg Position", value: (perf.position ?? 0).toFixed(1) },
      ];
      y = drawMetricCards(doc, gscMetrics, y, margin, contentW, ensureSpace);
    }

    // Top search queries
    if (gsc.topQueries?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Top Search Queries", margin, y);
      y += 6;

      const qHeaders = ["QUERY", "CLICKS", "IMPRESSIONS", "CTR", "POSITION"];
      const qWidths = [contentW * 0.36, contentW * 0.14, contentW * 0.18, contentW * 0.14, contentW * 0.18];
      const qRows = gsc.topQueries.slice(0, 10).map(q => [
        q.key || q.query || "â€”",
        String(q.clicks ?? 0),
        String(q.impressions ?? 0),
        `${(q.ctr ?? 0).toFixed(1)}%`,
        (q.position ?? 0).toFixed(1),
      ]);
      y = drawDataTable(doc, qHeaders, qRows, y, margin, pageW, contentW, ensureSpace, { colWidths: qWidths });
    }

    // Top pages
    if (gsc.topPages?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Top Pages", margin, y);
      y += 6;

      const pHeaders = ["PAGE", "CLICKS", "IMPRESSIONS", "CTR", "POSITION"];
      const pWidths = [contentW * 0.36, contentW * 0.14, contentW * 0.18, contentW * 0.14, contentW * 0.18];
      const pRows = gsc.topPages.slice(0, 10).map(p => {
        let displayUrl;
        try { displayUrl = new URL(p.key || p.url || "").pathname || "/"; } catch { displayUrl = p.key || p.url || "â€”"; }
        return [
          displayUrl,
          String(p.clicks ?? 0),
          String(p.impressions ?? 0),
          `${(p.ctr ?? 0).toFixed(1)}%`,
          (p.position ?? 0).toFixed(1),
        ];
      });
      y = drawDataTable(doc, pHeaders, pRows, y, margin, pageW, contentW, ensureSpace, { colWidths: pWidths });
    }

    // GSC checks
    if (gsc.checks?.length > 0) {
      y = drawCheckSection(doc, "Search Console Health", C.accent, gsc.checks, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  GA4 ANALYTICS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (results?.ga4?.available) {
    const ga4 = results.ga4;
    y = drawSectionHeader(doc, "Google Analytics (GA4)", C.violet, y, margin, pageW, ensureSpace);

    if (ga4.propertyName) {
      setColor(doc, C.textMuted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Property: ${ga4.propertyName}`, margin + 4, y);
      y += 5;
    }

    // Overview metrics
    if (ga4.overview) {
      const ov = ga4.overview;
      const ga4Metrics = [
        { label: "Sessions", value: (ov.sessions ?? 0).toLocaleString() },
        { label: "Users", value: (ov.users ?? 0).toLocaleString() },
        { label: "Pageviews", value: (ov.pageviews ?? 0).toLocaleString() },
        { label: "Bounce Rate", value: `${(ov.bounceRate ?? 0).toFixed(1)}%` },
        { label: "Avg Duration", value: `${Math.round(ov.avgSessionDuration ?? 0)}s` },
      ];
      y = drawMetricCards(doc, ga4Metrics, y, margin, contentW, ensureSpace);
    }

    // Traffic sources
    if (ga4.trafficSources?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Traffic Sources", margin, y);
      y += 6;

      const tsHeaders = ["CHANNEL", "SESSIONS", "USERS"];
      const tsWidths = [contentW * 0.50, contentW * 0.25, contentW * 0.25];
      const tsRows = ga4.trafficSources.slice(0, 8).map(src => [
        src.channel || "â€”",
        String(src.sessions ?? 0),
        String(src.users ?? 0),
      ]);
      y = drawDataTable(doc, tsHeaders, tsRows, y, margin, pageW, contentW, ensureSpace, { colWidths: tsWidths });
    }

    // Top pages
    if (ga4.topPages?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Top Pages by Pageviews", margin, y);
      y += 6;

      const tpHeaders = ["PAGE", "PAGEVIEWS", "SESSIONS", "BOUNCE RATE"];
      const tpWidths = [contentW * 0.40, contentW * 0.20, contentW * 0.20, contentW * 0.20];
      const tpRows = ga4.topPages.slice(0, 10).map(p => [
        p.path || "â€”",
        String(p.pageviews ?? 0),
        String(p.sessions ?? 0),
        `${(p.bounceRate ?? 0).toFixed(1)}%`,
      ]);
      y = drawDataTable(doc, tpHeaders, tpRows, y, margin, pageW, contentW, ensureSpace, { colWidths: tpWidths });
    }

    // GA4 checks
    if (ga4.checks?.length > 0) {
      y = drawCheckSection(doc, "Analytics Health", C.violet, ga4.checks, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  GOOGLE ADS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (results?.ads?.available) {
    const ads = results.ads;
    y = drawSectionHeader(doc, "Google Ads Performance", C.warning, y, margin, pageW, ensureSpace);

    // Overview metrics
    if (ads.overview) {
      const ov = ads.overview;
      const adsMetrics = [
        { label: "Impressions", value: (ov.impressions ?? 0).toLocaleString() },
        { label: "Clicks", value: (ov.clicks ?? 0).toLocaleString() },
        { label: "CTR", value: `${(ov.ctr ?? 0).toFixed(1)}%` },
        { label: "Avg CPC", value: `$${(ov.avgCpc ?? 0).toFixed(2)}` },
        { label: "Total Cost", value: `$${(ov.cost ?? 0).toFixed(2)}` },
        { label: "Conversions", value: (ov.conversions ?? 0).toFixed(1) },
      ];
      y = drawMetricCards(doc, adsMetrics, y, margin, contentW, ensureSpace);
    }

    // Campaigns table
    if (ads.campaigns?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Campaign Performance", margin, y);
      y += 6;

      const cHeaders = ["CAMPAIGN", "CLICKS", "IMPRESSIONS", "CTR", "CPC", "CONV"];
      const cWidths = [contentW * 0.28, contentW * 0.12, contentW * 0.16, contentW * 0.12, contentW * 0.16, contentW * 0.16];
      const cRows = ads.campaigns.slice(0, 10).map(c => [
        c.name || "â€”",
        String(c.clicks ?? 0),
        String(c.impressions ?? 0),
        `${(c.ctr ?? 0).toFixed(1)}%`,
        `$${(c.cpc ?? c.avgCpc ?? 0).toFixed(2)}`,
        String(c.conversions ?? 0),
      ]);
      y = drawDataTable(doc, cHeaders, cRows, y, margin, pageW, contentW, ensureSpace, { colWidths: cWidths });
    }

    // Top keywords
    if (ads.topKeywords?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Top Keywords", margin, y);
      y += 6;

      const kHeaders = ["KEYWORD", "CLICKS", "IMPRESSIONS", "CTR", "COST"];
      const kWidths = [contentW * 0.34, contentW * 0.14, contentW * 0.18, contentW * 0.14, contentW * 0.20];
      const kRows = ads.topKeywords.slice(0, 10).map(kw => [
        kw.keyword || "â€”",
        String(kw.clicks ?? 0),
        String(kw.impressions ?? 0),
        `${(kw.ctr ?? 0).toFixed(1)}%`,
        `$${(kw.cost ?? 0).toFixed(2)}`,
      ]);
      y = drawDataTable(doc, kHeaders, kRows, y, margin, pageW, contentW, ensureSpace, { colWidths: kWidths });
    }

    // Landing pages
    if (ads.landingPages?.length > 0) {
      y = ensureSpace(y, 12);
      setColor(doc, C.text);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Landing Pages", margin, y);
      y += 6;

      const lpHeaders = ["PAGE", "SESSIONS", "CLICKS", "BOUNCE RATE", "CONV"];
      const lpWidths = [contentW * 0.34, contentW * 0.14, contentW * 0.14, contentW * 0.20, contentW * 0.18];
      const lpRows = ads.landingPages.slice(0, 10).map(lp => [
        lp.page || "â€”",
        String(lp.sessions ?? 0),
        String(lp.clicks ?? 0),
        `${(lp.bounceRate ?? 0).toFixed(1)}%`,
        String(lp.conversions ?? 0),
      ]);
      y = drawDataTable(doc, lpHeaders, lpRows, y, margin, pageW, contentW, ensureSpace, { colWidths: lpWidths });
    }

    // Ads checks
    if (ads.checks?.length > 0) {
      y = drawCheckSection(doc, "Ads Health", C.warning, ads.checks, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  WORDPRESS INSIGHTS (if detected)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (results?.wordpress?.available) {
    const wp = results.wordpress;
    y = drawSectionHeader(doc, "WordPress Analysis", C.blue, y, margin, pageW, ensureSpace);

    const wpInfo = [
      wp.site?.name && `Site: ${wp.site.name}`,
      wp.site?.description && `Description: ${wp.site.description}`,
      wp.version && `Version: ${wp.version}`,
      wp.seo?.plugin && `SEO Plugin: ${wp.seo.plugin}`,
      wp.seo?.woocommerce && `WooCommerce: Active`,
    ];
    y = drawInfoList(doc, wpInfo, y, margin, ensureSpace);

    // Content stats
    if (wp.content) {
      y += 2;
      const contentInfo = [
        wp.content.posts != null && `Posts: ${wp.content.posts}`,
        wp.content.pages != null && `Pages: ${wp.content.pages}`,
        wp.content.avgWordCount != null && `Avg Word Count: ${wp.content.avgWordCount}`,
        wp.content.avgDaysBetweenPosts != null && `Publishing Frequency: Every ${wp.content.avgDaysBetweenPosts} days`,
        wp.content.latestPostTitle && `Latest Post: ${wp.content.latestPostTitle}`,
        wp.content.daysSinceLastPost != null && `Days Since Last Post: ${wp.content.daysSinceLastPost}`,
      ];
      y = drawInfoList(doc, contentInfo, y, margin, ensureSpace);
    }

    // Taxonomy
    if (wp.taxonomy) {
      const taxInfo = [
        wp.taxonomy.categories != null && `Categories: ${wp.taxonomy.categories}`,
        wp.taxonomy.tags != null && `Tags: ${wp.taxonomy.tags}`,
      ];
      y = drawInfoList(doc, taxInfo, y, margin, ensureSpace);
    }

    // WordPress checks
    if (wp.checks?.length > 0) {
      y = drawCheckSection(doc, "WordPress Health", C.blue, wp.checks, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  SHOPIFY INSIGHTS (if detected)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (results?.shopify?.available) {
    const shop = results.shopify;
    y = drawSectionHeader(doc, "Shopify Analysis", C.shopify, y, margin, pageW, ensureSpace);

    const shopInfo = [
      shop.store?.name && `Store: ${shop.store.name}`,
      shop.store?.description && `Description: ${shop.store.description}`,
      shop.store?.currency && `Currency: ${shop.store.currency}`,
    ];
    y = drawInfoList(doc, shopInfo, y, margin, ensureSpace);

    // Product stats
    if (shop.products) {
      y += 2;
      const prodInfo = [
        shop.products.total != null && `Products: ${shop.products.total}`,
        shop.products.totalVariants != null && `Total Variants: ${shop.products.totalVariants}`,
        shop.products.totalImages != null && `Product Images: ${shop.products.totalImages}`,
      ];
      y = drawInfoList(doc, prodInfo, y, margin, ensureSpace);
    }

    // Collections
    if (shop.collections) {
      const collInfo = [
        shop.collections.total != null && `Collections: ${shop.collections.total}`,
      ];
      y = drawInfoList(doc, collInfo, y, margin, ensureSpace);
    }

    // Shopify checks
    if (shop.checks?.length > 0) {
      y = drawCheckSection(doc, "Shopify Health", C.shopify, shop.checks, y, margin, pageW, contentW, ensureSpace, false, showExpertInfo);
    }
  }

  // â”€â”€ Legacy WordPress format (old data shape) â”€â”€
  if (results?.wordpress?.detected && !results?.wordpress?.available) {
    y = drawSectionHeader(doc, "WordPress Analysis", C.blue, y, margin, pageW, ensureSpace);

    const wp = results.wordpress;
    const wpInfo = [
      wp.version && `Version: ${wp.version}`,
      wp.theme?.name && `Theme: ${wp.theme.name}`,
      wp.plugins?.count != null && `Active Plugins: ${wp.plugins.count}`,
      wp.plugins?.seoPlugin && `SEO Plugin: ${wp.plugins.seoPlugin}`,
    ];
    y = drawInfoList(doc, wpInfo, y, margin, ensureSpace);

    if (wp.recommendations?.length > 0) {
      y += 4;
      setColor(doc, C.textDim);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("RECOMMENDATIONS", margin + 4, y);
      y += 5;

      wp.recommendations.slice(0, 5).forEach(rec => {
        y = ensureSpace(y, 8);
        setColor(doc, C.textMuted);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const text = typeof rec === "string" ? rec : rec.text || rec.label || "";
        if (text) {
          const lines = doc.splitTextToSize(`â€¢ ${text}`, contentW - 8);
          doc.text(lines, margin + 4, y);
          y += lines.length * 4;
        }
      });
    }
  }

  // â”€â”€ Footer on every page â”€â”€
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, pageW, pageH, p, totalPages);
  }

  // â”€â”€ Save â”€â”€
  const domain = (results?.finalUrl || url || "site").replace(/https?:\/\//, "").replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Trivium_${domain}_${dateStr}.pdf`);
}

function addFooter(doc, pageW, pageH, page, total) {
  const footerY = pageH - 8;
  drawLine(doc, 16, footerY - 3, pageW - 16, footerY - 3, C.border, 0.2);

  setColor(doc, C.textDim);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Generated by Trivium", 16, footerY);

  if (page && total) {
    doc.text(`${page} / ${total}`, pageW - 16, footerY, { align: "right" });
  }
}
