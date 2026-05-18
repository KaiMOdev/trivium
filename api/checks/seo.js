// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const { isCJK, countCJKWords } = require("../utils/readability");
const { shouldSkipCheck } = require("../config/checkApplicability");
const { checkExists } = require("../utils/fetch-helpers");

function naResult(label, pageType) {
  return { label, score: 100, status: "na", detail: `Not applicable for ${pageType} pages` };
}

/**
 * Run real SEO checks against parsed page data.
 * Updated with 2025-2026 best practices.
 *
 * @param {object} pageData
 * @param {object} robotsTxt
 * @param {object} [siteContext]
 * @param {{ checkUrlExists?: typeof checkExists }} [deps] - Optional dependency injection for network checks
 */
async function runSeoChecks(pageData, robotsTxt, siteContext, deps = {}) {
  const results = [];
  const checkUrlExists = deps.checkUrlExists || checkExists;

  // 1. Title Tag
  const titleLen = pageData.title.length;
  if (titleLen === 0) {
    results.push({ label: "Title Tag", status: "fail", detail: "No title tag found", score: 0 });
  } else if (titleLen >= 50 && titleLen <= 60) {
    results.push({ label: "Title Tag", status: "pass", detail: `${titleLen} chars — optimal length`, score: 95 });
  } else if (titleLen < 30) {
    results.push({ label: "Title Tag", status: "warn", detail: `${titleLen} chars — too short (aim for 50-60)`, score: 45 });
  } else if (titleLen > 60) {
    results.push({ label: "Title Tag", status: "warn", detail: `${titleLen} chars — over 60 limit, may be truncated`, score: 60 });
  } else {
    results.push({ label: "Title Tag", status: "pass", detail: `${titleLen} chars — acceptable length`, score: 80 });
  }

  // 2. Meta Description
  const descLen = pageData.metaDescription.length;
  if (descLen === 0) {
    results.push({ label: "Meta Description", status: "fail", detail: "No meta description found", score: 0 });
  } else if (descLen >= 120 && descLen <= 160) {
    results.push({ label: "Meta Description", status: "pass", detail: `${descLen} chars — optimal length`, score: 95 });
  } else if (descLen < 70) {
    results.push({ label: "Meta Description", status: "warn", detail: `${descLen} chars — too short (aim for 120-160)`, score: 45 });
  } else if (descLen > 160) {
    results.push({ label: "Meta Description", status: "warn", detail: `${descLen} chars — over 160 limit`, score: 65 });
  } else {
    results.push({ label: "Meta Description", status: "pass", detail: `${descLen} chars — acceptable length`, score: 80 });
  }

  // 3. H1 Tag
  const h1Count = pageData.h1s.length;
  if (h1Count === 0) {
    results.push({ label: "H1 Tag", status: "fail", detail: "No H1 tag found", score: 0 });
  } else if (h1Count === 1) {
    results.push({ label: "H1 Tag", status: "pass", detail: "1 H1 found, clear hierarchy", score: 100 });
  } else {
    results.push({ label: "H1 Tag", status: "warn", detail: `${h1Count} H1 tags found — use only 1 for clear hierarchy`, score: 50 });
  }

  // 4. Heading Hierarchy — proper nesting (H1 > H2 > H3, no skipped levels)
  const order = pageData.headingOrder || [];
  if (order.length === 0) {
    results.push({ label: "Heading Hierarchy", status: "fail", detail: "No headings found — page lacks semantic structure", score: 0 });
  } else {
    let skips = 0;
    const skipItems = [];
    for (let i = 1; i < order.length; i++) {
      if (order[i] > order[i - 1] + 1) {
        skips++;
        skipItems.push(`H${order[i - 1]} → H${order[i]} (skipped H${order[i - 1] + 1})`);
      }
    }
    if (skips === 0) {
      results.push({ label: "Heading Hierarchy", status: "pass", detail: `${order.length} headings in proper nested order — clear semantic outline`, score: 100 });
    } else if (skips <= 2) {
      results.push({ label: "Heading Hierarchy", status: "warn", detail: `${skips} heading level skip(s) detected — maintain H1 > H2 > H3 order`, score: 60, items: skipItems });
    } else {
      results.push({ label: "Heading Hierarchy", status: "fail", detail: `${skips} heading level skips — broken hierarchy hurts SEO and AI parsing`, score: 25, items: skipItems.slice(0, 10) });
    }
  }

  // 5. Image Alt Tags
  const { total: totalImg, withoutAlt, withoutAltItems } = pageData.images;
  if (totalImg === 0) {
    results.push({ label: "Image Alt Tags", status: "pass", detail: "No images on page", score: 100 });
  } else if (withoutAlt === 0) {
    results.push({ label: "Image Alt Tags", status: "pass", detail: `All ${totalImg} images have alt text`, score: 100 });
  } else {
    const pct = Math.round(((totalImg - withoutAlt) / totalImg) * 100);
    const score = Math.max(0, pct);
    const status = pct >= 80 ? "warn" : "fail";
    results.push({ label: "Image Alt Tags", status, detail: `${withoutAlt} of ${totalImg} images missing alt text`, score, items: (withoutAltItems || []).slice(0, 10) });
  }

  // 6. Canonical URL — enhanced: presence + validity + self-reference check
  if (!pageData.canonical) {
    results.push({ label: "Canonical URL", status: "warn", detail: "No canonical URL found — may cause duplicate content issues", score: 50 });
  } else {
    let canonicalAbs = null;
    try {
      canonicalAbs = new URL(pageData.canonical, pageData.url).href;
    } catch {
      // invalid URL
    }

    if (!canonicalAbs) {
      results.push({ label: "Canonical URL", status: "fail", detail: `Invalid canonical URL: "${pageData.canonical}"`, score: 10 });
    } else {
      let currentAbs;
      try { currentAbs = new URL(pageData.url).href; } catch { currentAbs = pageData.url; }

      // Normalize: remove trailing slash, fragment, query
      const normalize = (u) => u.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
      const canonicalNorm = normalize(canonicalAbs);
      const currentNorm = normalize(currentAbs);

      if (canonicalNorm === currentNorm) {
        // Self-referencing — no HEAD needed (we already fetched the page).
        results.push({ label: "Canonical URL", status: "pass", detail: "Canonical URL matches current page (self-referencing)", score: 100 });
      } else {
        // Canonical points elsewhere — verify it actually resolves.
        let sameHost = false;
        try { sameHost = new URL(canonicalAbs).host === new URL(currentAbs).host; } catch {}

        const reachable = await checkUrlExists(canonicalAbs);

        if (!reachable.exists) {
          // Canonical returns 404 / 5xx / network error — severe issue.
          const statusLabel = reachable.status > 0 ? `HTTP ${reachable.status}` : (reachable.error || "network error");
          results.push({
            label: "Canonical URL",
            status: "fail",
            detail: `Canonical URL unreachable (${statusLabel}) — search engines will see broken canonical`,
            score: 5,
            items: [`Current: ${currentAbs}`, `Canonical: ${canonicalAbs}`, `Status: ${statusLabel}`],
          });
        } else if (reachable.redirected && reachable.finalUrl) {
          // Canonicals should not redirect — signal to search engines is weakened.
          const finalNorm = normalize(reachable.finalUrl);
          if (finalNorm === currentNorm) {
            // Redirects back to current page — equivalent to self-reference but via detour.
            results.push({
              label: "Canonical URL",
              status: "warn",
              detail: `Canonical URL redirects back to current page — use self-referencing canonical instead`,
              score: 55,
              items: [`Current: ${currentAbs}`, `Canonical: ${canonicalAbs}`, `Redirects to: ${reachable.finalUrl}`],
            });
          } else {
            results.push({
              label: "Canonical URL",
              status: "warn",
              detail: `Canonical URL redirects to ${reachable.finalUrl} — should point directly to the final URL`,
              score: 40,
              items: [`Current: ${currentAbs}`, `Canonical: ${canonicalAbs}`, `Redirects to: ${reachable.finalUrl}`],
            });
          }
        } else if (sameHost) {
          // Reachable, no redirect, same host — probably intentional variant page.
          results.push({
            label: "Canonical URL",
            status: "warn",
            detail: `Canonical points to different URL on same domain: ${canonicalAbs}`,
            score: 60,
            items: [`Current: ${currentAbs}`, `Canonical: ${canonicalAbs}`],
          });
        } else {
          // Reachable, no redirect, different domain — suspicious (intentional but rare).
          results.push({
            label: "Canonical URL",
            status: "fail",
            detail: `Canonical points to different domain: ${canonicalAbs}`,
            score: 20,
            items: [`Current: ${currentAbs}`, `Canonical: ${canonicalAbs}`],
          });
        }
      }
    }
  }

  // 6b. Canonical / og:url Consistency
  if (pageData.canonical && pageData.og && pageData.og.url) {
    let canonicalAbs, ogUrlAbs;
    try { canonicalAbs = new URL(pageData.canonical, pageData.url).href; } catch {}
    try { ogUrlAbs = new URL(pageData.og.url, pageData.url).href; } catch {}

    if (canonicalAbs && ogUrlAbs) {
      const normalize = (u) => u.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
      if (normalize(canonicalAbs) === normalize(ogUrlAbs)) {
        results.push({ label: "Canonical og:url Consistency", status: "pass", detail: "Canonical URL and og:url match", score: 100 });
      } else {
        results.push({
          label: "Canonical og:url Consistency",
          status: "warn",
          detail: "Canonical URL and og:url disagree — may confuse crawlers",
          score: 50,
          items: [`Canonical: ${canonicalAbs}`, `og:url: ${ogUrlAbs}`],
        });
      }
    }
  }

  // 6c. Schema URL Consistency — JSON-LD @id / url / mainEntityOfPage should match page URL
  if (pageData.jsonLdEntities && pageData.jsonLdEntities.length > 0) {
    let currentAbs;
    try { currentAbs = new URL(pageData.url).href; } catch { currentAbs = pageData.url; }
    const normalize = (u) => (u || "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
    const currentNorm = normalize(currentAbs);

    const mismatches = [];
    for (const entity of pageData.jsonLdEntities) {
      if (!entity || typeof entity !== "object") continue;
      const type = Array.isArray(entity["@type"]) ? entity["@type"][0] : entity["@type"];
      // Only check page-level entities (Article, WebPage, etc.) — skip Organization, BreadcrumbList
      if (!type || ["Organization", "BreadcrumbList", "Person", "ImageObject", "WebSite"].includes(type)) continue;

      for (const field of ["@id", "url", "mainEntityOfPage"]) {
        let val = entity[field];
        if (val && typeof val === "object") val = val["@id"] || val.url;
        if (!val || typeof val !== "string") continue;
        try {
          const abs = new URL(val, pageData.url).href;
          if (normalize(abs) !== currentNorm) {
            mismatches.push(`${type}.${field}: ${abs}`);
          }
        } catch {}
      }
    }

    if (mismatches.length === 0) {
      results.push({ label: "Schema URL Consistency", status: "pass", detail: "JSON-LD URLs match page URL", score: 100 });
    } else {
      results.push({
        label: "Schema URL Consistency",
        status: mismatches.length > 2 ? "fail" : "warn",
        detail: `${mismatches.length} schema URL(s) don't match page URL — may cause canonical confusion`,
        score: mismatches.length > 2 ? 30 : 55,
        items: mismatches.slice(0, 5),
      });
    }
  }

  // 7. Open Graph Tags
  if (shouldSkipCheck(pageData.pageType, "Open Graph Tags")) {
    results.push(naResult("Open Graph Tags", pageData.pageType));
  } else {
    const ogKeys = Object.keys(pageData.og);
    const requiredOg = ["title", "description", "image", "type", "url", "site_name"];
    const presentOg = requiredOg.filter(k => ogKeys.includes(k) && pageData.og[k]);
    const missingOg = requiredOg.filter(k => !presentOg.includes(k));
    const count = presentOg.length;
    let ogScore;
    if (count === 6) ogScore = 100;
    else if (count === 5) ogScore = 80;
    else if (count === 4) ogScore = 60;
    else if (count === 3) ogScore = 45;
    else ogScore = 25;
    const ogItems = [
      ...presentOg.map(k => `og:${k} = "${(pageData.og[k] || "").slice(0, 60)}"`),
      ...missingOg.map(k => `Missing: og:${k}`),
    ];
    results.push({
      label: "Open Graph Tags",
      status: ogScore >= 75 ? "pass" : ogScore >= 45 ? "warn" : "fail",
      detail: count === 6
        ? "All 6 Open Graph tags present (og:title, og:description, og:image, og:type, og:url, og:site_name)"
        : `Missing: ${missingOg.map(k => `og:${k}`).join(", ")} (${count}/6 present)`,
      score: ogScore,
      items: ogItems,
    });
  }

  // 8. JSON-LD Schema
  const entities = pageData.jsonLdEntities || [];
  if (entities.length > 0) {
    const types = entities
      .flatMap(j => Array.isArray(j["@type"]) ? j["@type"] : [j["@type"]])
      .filter(Boolean);
    const uniqueTypes = [...new Set(types)];
    results.push({ label: "JSON-LD Schema", status: "pass", detail: `${entities.length} schema entit${entities.length === 1 ? "y" : "ies"} found: ${uniqueTypes.join(", ")}`, score: 90, items: uniqueTypes.map(t => `@type: ${t}`) });
  } else if (pageData.jsonLd.length > 0) {
    results.push({ label: "JSON-LD Schema", status: "pass", detail: `${pageData.jsonLd.length} schema(s) found`, score: 80 });
  } else {
    results.push({ label: "JSON-LD Schema", status: "fail", detail: "No structured data found", score: 10 });
  }

  // 9. Structured Data Completeness — validate key properties are present
  if (shouldSkipCheck(pageData.pageType, "Schema Completeness")) {
    results.push(naResult("Schema Completeness", pageData.pageType));
  } else {
    const sc = pageData.schemaCompleteness || {};
    if (sc.org || sc.article) {
      let missing = [];
      if (sc.org) {
        if (!sc.org.hasName) missing.push("org:name");
        if (!sc.org.hasLogo) missing.push("org:logo");
        if (!sc.org.hasSameAs) missing.push("org:sameAs");
        if (!sc.org.hasContactPoint) missing.push("org:contactPoint");
      }
      if (sc.article) {
        if (!sc.article.hasAuthor) missing.push("article:author");
        if (!sc.article.hasDateModified) missing.push("article:dateModified");
        if (!sc.article.hasImage) missing.push("article:image");
      }
      if (missing.length === 0) {
        results.push({ label: "Schema Completeness", status: "pass", detail: "All key schema properties present — maximum rich result eligibility", score: 95 });
      } else if (missing.length <= 2) {
        results.push({ label: "Schema Completeness", status: "warn", detail: `Missing properties: ${missing.join(", ")} — limits rich results and AI understanding`, score: 65, items: missing });
      } else {
        results.push({ label: "Schema Completeness", status: "warn", detail: `${missing.length} schema properties missing: ${missing.join(", ")}`, score: 40, items: missing });
      }
    } else if (entities.length === 0) {
      results.push({ label: "Schema Completeness", status: "fail", detail: "No schema to validate — add Organization and/or Article schema", score: 0 });
    }
  }

  // 10. Meta Robots Directive
  const metaRobots = pageData.metaRobots || "";
  if (metaRobots.includes("noindex")) {
    results.push({ label: "Meta Robots", status: "fail", detail: "Page set to noindex — will not appear in search results", score: 0 });
  } else if (metaRobots.includes("nosnippet")) {
    results.push({ label: "Meta Robots", status: "warn", detail: "nosnippet directive — prevents AI Overviews and featured snippets", score: 35 });
  } else if (metaRobots.includes("noarchive")) {
    results.push({ label: "Meta Robots", status: "warn", detail: "noarchive directive — may limit cached content availability", score: 60 });
  } else {
    results.push({ label: "Meta Robots", status: "pass", detail: metaRobots ? `Robots: ${metaRobots}` : "No restrictive robots directives", score: 100 });
  }

  // 11. Mobile Viewport
  if (pageData.viewport) {
    results.push({ label: "Mobile Viewport", status: "pass", detail: "Viewport meta tag configured", score: 100 });
  } else {
    results.push({ label: "Mobile Viewport", status: "fail", detail: "No viewport meta tag — not mobile-friendly (all Google crawling uses mobile-first indexing)", score: 0 });
  }

  // 12. robots.txt
  if (robotsTxt.accessible) {
    const criticalBlocks = robotsTxt.disallowed.filter(d => d === "/" || d === "/*");
    if (criticalBlocks.length > 0) {
      results.push({ label: "robots.txt", status: "fail", detail: "robots.txt blocks entire site", score: 10 });
    } else {
      results.push({ label: "robots.txt", status: "pass", detail: `Accessible, ${robotsTxt.disallowed.length} disallow rules`, score: 90 });
    }
  } else {
    results.push({ label: "robots.txt", status: "warn", detail: "robots.txt not accessible", score: 50 });
  }

  // 13. SSL Certificate
  if (pageData.isHttps) {
    results.push({ label: "SSL Certificate", status: "pass", detail: "Site served over HTTPS", score: 100 });
  } else {
    results.push({ label: "SSL Certificate", status: "fail", detail: "Site not using HTTPS — browsers mark as 'Not Secure'", score: 0 });
  }

  // 14. Hreflang Tags — only checked if site has multiple languages
  if (pageData.hasMultipleLanguages) {
    if (pageData.hreflang.length > 0) {
      const hreflangItems = pageData.hreflang.slice(0, 10).map(h => `${h.lang}: ${h.href}`);
      const hasXDefault = pageData.hreflang.some(h => (h.lang || "").toLowerCase() === "x-default");
      // x-default is required by Google when ≥2 locale variants exist — points users
      // whose locale isn't matched at a fallback page.
      const localeVariants = pageData.hreflang.filter(h => (h.lang || "").toLowerCase() !== "x-default").length;
      if (localeVariants >= 2 && !hasXDefault) {
        results.push({
          label: "Hreflang Tags",
          status: "warn",
          detail: `${pageData.hreflang.length} language variants defined but no x-default — Google recommends an x-default fallback for unmatched locales`,
          score: 65,
          items: hreflangItems,
        });
      } else {
        results.push({
          label: "Hreflang Tags",
          status: "pass",
          detail: hasXDefault
            ? `${pageData.hreflang.length} language variants defined (includes x-default fallback)`
            : `${pageData.hreflang.length} language variants defined`,
          score: 95,
          items: hreflangItems,
        });
      }
    } else {
      results.push({ label: "Hreflang Tags", status: "fail", detail: "Multi-language site detected but no hreflang tags — search engines can't identify language variants", score: 15 });
    }
  }
  // Single-language sites: check excluded from results entirely

  // 15. Internal Links
  if (shouldSkipCheck(pageData.pageType, "Internal Linking")) {
    results.push(naResult("Internal Linking", pageData.pageType));
  } else {
    const intLinks = pageData.links.internal;
    if (intLinks > 15) {
      results.push({ label: "Internal Linking", status: "pass", detail: `${intLinks} internal links — strong internal link structure`, score: 95 });
    } else if (intLinks > 10) {
      results.push({ label: "Internal Linking", status: "pass", detail: `${intLinks} internal links found`, score: 85 });
    } else if (intLinks > 3) {
      results.push({ label: "Internal Linking", status: "pass", detail: `${intLinks} internal links — consider adding more for pillar page strategy`, score: 70 });
    } else {
      results.push({ label: "Internal Linking", status: "warn", detail: `Only ${intLinks} internal links — pages need 10+ for proper crawlability and topical authority`, score: 40 });
    }
  }

  // 16. Page Word Count / Thin Content — page-type-aware thresholds
  // Different page types have fundamentally different content needs:
  // articles need depth, product pages need specs not filler, contact pages need minimal text
  const CONTENT_DEPTH_THRESHOLDS = {
    article:  { excellent: 1500, adequate: 800, thin: 300 },
    service:  { excellent: 600,  adequate: 300, thin: 150 },
    product:  { excellent: 300,  adequate: 150, thin: 50 },
    landing:  { excellent: 400,  adequate: 200, thin: 100 },
    utility:  { excellent: 150,  adequate: 75,  thin: 25 },
    support:  { excellent: 600,  adequate: 300, thin: 100 },
    generic:  { excellent: 800,  adequate: 400, thin: 150 },
  };
  if (shouldSkipCheck(pageData.pageType, "Content Depth")) {
    results.push(naResult("Content Depth", pageData.pageType));
  } else {
    const rawWc = pageData.wordCount || 0;
    const allText = pageData.paragraphs.join(" ");
    const cjkContent = isCJK(allText);
    const wc = cjkContent ? countCJKWords(allText) : rawWc;
    const wcLabel = cjkContent ? `~${wc} words equiv.` : `${wc} words`;
    const isSpa = wc < 50 && (pageData.contentToCodeRatio || 0) < 3 && pageData.jsonLdEntities?.length > 0;
    const pt = pageData.pageType || "generic";
    const t = CONTENT_DEPTH_THRESHOLDS[pt] || CONTENT_DEPTH_THRESHOLDS.generic;
    if (isSpa) {
      results.push({ label: "Content Depth", status: "warn", detail: `${wcLabel} in server HTML — page appears to be a client-rendered SPA (content loaded via JS). Search engines may not fully index JS-rendered content`, score: 45 });
    } else if (wc >= t.excellent) {
      results.push({ label: "Content Depth", status: "pass", detail: `${wcLabel} — comprehensive content depth for ${pt} page`, score: 90 });
    } else if (wc >= t.adequate) {
      results.push({ label: "Content Depth", status: "pass", detail: `${wcLabel} — adequate content length for ${pt} page`, score: 75 });
    } else if (wc >= t.thin) {
      results.push({ label: "Content Depth", status: "warn", detail: `${wcLabel} — consider adding more content for better ranking potential`, score: 55 });
    } else {
      results.push({ label: "Content Depth", status: "fail", detail: `Only ${wcLabel} — thin content rarely ranks or gets cited by AI`, score: 25 });
    }
  }

  // 17. Content-to-Code Ratio
  const ratio = pageData.contentToCodeRatio || 0;
  const ratioRounded = Math.round(ratio * 10) / 10;
  if (ratio >= 15) {
    results.push({ label: "Content-to-Code Ratio", status: "pass", detail: `${ratioRounded}% text ratio — clean, content-rich HTML`, score: 90 });
  } else if (ratio >= 5) {
    results.push({ label: "Content-to-Code Ratio", status: "warn", detail: `${ratioRounded}% text ratio — could improve (aim for 15%+)`, score: 60 });
  } else {
    results.push({ label: "Content-to-Code Ratio", status: "fail", detail: `${ratioRounded}% text ratio — page is bloated with code relative to content`, score: 25 });
  }

  // 18. HTML Lang Attribute (W3C, Bing, Google)
  const htmlLang = pageData.htmlLang || null;
  if (htmlLang) {
    const validLang = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(htmlLang);
    results.push({
      label: "HTML Lang Attribute",
      status: validLang ? "pass" : "warn",
      detail: validLang
        ? `lang="${htmlLang}" — helps search engines and screen readers identify page language`
        : `lang="${htmlLang}" — value looks malformed (expected format: "en", "en-US")`,
      score: validLang ? 100 : 50,
    });
  } else {
    results.push({ label: "HTML Lang Attribute", status: "fail", detail: "No lang attribute on <html> — recommended by W3C, Bing, and Google for language identification", score: 15 });
  }

  // 19. URL Cleanliness (Moz, Bing)
  try {
    const parsedUrl = new URL(pageData.url || "https://example.com");
    const path = parsedUrl.pathname;
    const issues = [];
    if (path !== path.toLowerCase()) issues.push("uppercase characters");
    if (path.includes("_")) issues.push("underscores (use hyphens)");
    if (/[&?].*[&?]/.test(parsedUrl.search) || parsedUrl.search.length > 100) issues.push("excessive query parameters");
    if (path.length > 115) issues.push("path too long (over 115 chars)");
    if (/\/\//.test(path.replace(/^\/\//, ""))) issues.push("double slashes");
    if (issues.length === 0) {
      results.push({ label: "URL Cleanliness", status: "pass", detail: "Clean URL structure — lowercase, hyphenated, no excess parameters", score: 95 });
    } else if (issues.length <= 2) {
      results.push({ label: "URL Cleanliness", status: "warn", detail: `URL issues: ${issues.join(", ")}`, score: 60, items: issues });
    } else {
      results.push({ label: "URL Cleanliness", status: "fail", detail: `${issues.length} URL issues found — messy URLs hurt click-through and crawlability`, score: 25, items: issues });
    }
  } catch {
    results.push({ label: "URL Cleanliness", status: "warn", detail: "Could not parse URL for analysis", score: 50 });
  }

  // 20. Breadcrumb Schema (Google Search Central, Schema.org)
  // Homepages (root paths like /, /nl/, /fr/) don't need breadcrumbs — they ARE the root
  if (shouldSkipCheck(pageData.pageType, "Breadcrumb Schema")) {
    results.push(naResult("Breadcrumb Schema", pageData.pageType));
  } else {
    const urlPath = (() => { try { return new URL(pageData.url || "").pathname; } catch { return "/"; } })();
    const isHomepage = /^\/?([a-z]{2}(-[a-z]{2})?\/?)?$/.test(urlPath);
    if (pageData.hasBreadcrumbSchema) {
      results.push({ label: "Breadcrumb Schema", status: "pass", detail: "BreadcrumbList schema found — enables breadcrumb rich results in Google", score: 100 });
    } else if (isHomepage) {
      results.push({ label: "Breadcrumb Schema", status: "pass", detail: "Homepage — breadcrumb schema not needed (page is the root)", score: 100 });
    } else {
      results.push({ label: "Breadcrumb Schema", status: "warn", detail: "No BreadcrumbList schema — add it for breadcrumb rich results (recommended by Google)", score: 45 });
    }
  }

  // 21. Sitemap in robots.txt (Moz, Google Search Central)
  const sitemapDirs = robotsTxt?.sitemapDirectives || [];
  if (sitemapDirs.length > 0) {
    results.push({ label: "Sitemap in robots.txt", status: "pass", detail: `${sitemapDirs.length} Sitemap directive(s) found in robots.txt`, score: 100, items: sitemapDirs.slice(0, 5) });
  } else if (robotsTxt?.accessible) {
    results.push({ label: "Sitemap in robots.txt", status: "warn", detail: "No Sitemap directive in robots.txt — helps search engines discover your sitemap faster", score: 50 });
  } else {
    results.push({ label: "Sitemap in robots.txt", status: "fail", detail: "robots.txt not accessible — cannot verify sitemap directive", score: 30 });
  }

  // 21b. Sitemap Completeness — are discovered pages listed in sitemap?
  if (siteContext && siteContext.discoveredUrls && siteContext.discoveredUrls.length > 0) {
    const normalize = (u) => { try { let p = new URL(u).pathname.replace(/\/index\.html?$/, "").replace(/\/$/, "") || "/"; return p; } catch { return u; } };
    const sitemapPaths = new Set((siteContext.sitemapUrls || []).map(normalize));
    const discoveredPaths = siteContext.discoveredUrls.map(normalize);
    const total = discoveredPaths.length;
    const inSitemap = discoveredPaths.filter(p => sitemapPaths.has(p)).length;

    if (sitemapPaths.size === 0) {
      results.push({ label: "Sitemap Completeness", status: "fail", detail: "No sitemap found — search engines rely on sitemaps to discover all your pages", score: 0 });
    } else {
      const pct = Math.round((inSitemap / total) * 100);
      const missingPaths = discoveredPaths.filter(p => !sitemapPaths.has(p));
      const missingDisplay = missingPaths.slice(0, 5);
      const extra = missingPaths.length > 5 ? ` + ${missingPaths.length - 5} more` : "";
      let smScore;
      if (pct === 100) smScore = 100;
      else if (pct >= 80) smScore = 70;
      else if (pct >= 50) smScore = 40;
      else smScore = 15;
      results.push({
        label: "Sitemap Completeness",
        status: smScore >= 75 ? "pass" : smScore >= 45 ? "warn" : "fail",
        detail: pct === 100
          ? `All ${total} discovered pages found in sitemap`
          : `${inSitemap} of ${total} discovered pages in sitemap (${pct}%)${missingPaths.length > 0 ? " — Missing: " + missingDisplay.join(", ") + extra : ""}`,
        score: smScore,
        items: missingPaths.length > 0 ? missingPaths.map(p => `Missing: ${p}`) : undefined,
      });
    }
  }

  // 21d. Sitemap Freshness — <lastmod> coverage + accuracy
  // Google: <lastmod> is trust-binary. If dates look fake (all identical, all "today"),
  // Google ignores the tag site-wide. Per Gary Illyes (2024 guidance).
  if (siteContext && siteContext.sitemapLastmodMap && siteContext.sitemapUrls && siteContext.sitemapUrls.length > 0) {
    const sitemapUrlCount = siteContext.sitemapUrls.length;
    const withLastmod = siteContext.sitemapLastmodMap.size;
    const pct = Math.round((withLastmod / sitemapUrlCount) * 100);

    // Detect "all identical" / "auto-stamped today" anti-pattern.
    // Only meaningful with enough data points (≥10 dates) to rule out coincidence.
    let suspiciousUniformity = null;
    if (withLastmod >= 10) {
      const dateOnly = (s) => (s || "").slice(0, 10); // YYYY-MM-DD
      const lastmodDates = [...siteContext.sitemapLastmodMap.values()].map(dateOnly).filter(Boolean);
      const uniqueDates = new Set(lastmodDates);
      if (uniqueDates.size === 1) {
        suspiciousUniformity = `All ${withLastmod} <lastmod> values are identical (${[...uniqueDates][0]})`;
      } else {
        // All within 24h of right now — likely an auto-stamp on crawl
        const now = Date.now();
        const allWithin24h = lastmodDates.every(d => {
          const t = new Date(d).getTime();
          return !isNaN(t) && (now - t) <= 24 * 60 * 60 * 1000;
        });
        if (allWithin24h && uniqueDates.size <= 2) {
          suspiciousUniformity = `All ${withLastmod} <lastmod> values are within the last 24h — likely a CMS auto-stamp, not real update times`;
        }
      }
    }

    let smfScore, smfStatus, smfDetail;
    if (sitemapUrlCount < 3) {
      smfScore = 100;
      smfStatus = "pass";
      smfDetail = `Sitemap has ${sitemapUrlCount} URL(s) — too small to evaluate <lastmod> coverage`;
    } else if (suspiciousUniformity) {
      smfScore = 35;
      smfStatus = "fail";
      smfDetail = `${suspiciousUniformity} — Google ignores <lastmod> site-wide when dates look fake (per Gary Illyes, 2024)`;
    } else if (pct >= 90) {
      smfScore = 100;
      smfStatus = "pass";
      smfDetail = `${withLastmod}/${sitemapUrlCount} sitemap URLs include <lastmod> (${pct}%) — helps crawlers prioritize updates`;
    } else if (pct >= 50) {
      smfScore = 60;
      smfStatus = "warn";
      smfDetail = `Only ${withLastmod}/${sitemapUrlCount} sitemap URLs have <lastmod> (${pct}%) — Google recommends <lastmod> on every URL`;
    } else {
      smfScore = 30;
      smfStatus = "fail";
      smfDetail = withLastmod === 0
        ? `No <lastmod> values in sitemap — crawlers can't tell which pages changed`
        : `Only ${withLastmod}/${sitemapUrlCount} sitemap URLs have <lastmod> (${pct}%) — add <lastmod> for better crawl prioritization`;
    }
    results.push({ label: "Sitemap Freshness", status: smfStatus, detail: smfDetail, score: smfScore });
  }

  // 22. Semantic HTML Landmarks (W3C)
  const landmarks = pageData.semanticLandmarks || {};
  const hasNav = (landmarks.nav || 0) > 0;
  const hasMain = (landmarks.main || 0) > 0;
  const hasHeader = (landmarks.header || 0) > 0;
  const hasFooter = (landmarks.footer || 0) > 0;
  const landmarkCount = (hasNav ? 1 : 0) + (hasMain ? 1 : 0) + (hasHeader ? 1 : 0) + (hasFooter ? 1 : 0);
  const missing = [];
  if (!hasNav) missing.push("<nav>");
  if (!hasMain) missing.push("<main>");
  if (!hasHeader) missing.push("<header>");
  if (!hasFooter) missing.push("<footer>");
  if (landmarkCount >= 4) {
    results.push({ label: "Semantic HTML", status: "pass", detail: "All key semantic landmarks present (nav, main, header, footer)", score: 100 });
  } else if (landmarkCount >= 2) {
    results.push({ label: "Semantic HTML", status: "warn", detail: `Missing: ${missing.join(", ")} — semantic elements help crawlers understand page structure`, score: 55, items: missing });
  } else {
    results.push({ label: "Semantic HTML", status: "fail", detail: `Only ${landmarkCount} of 4 semantic landmarks — page lacks structural semantics for crawlers`, score: 30, items: missing });
  }

  // 23. Duplicate Title / H1 (Moz)
  const titleNorm = pageData.title.trim().toLowerCase();
  const h1Norm = (pageData.h1s[0] || "").trim().toLowerCase();
  if (!titleNorm || !h1Norm) {
    results.push({ label: "Title / H1 Uniqueness", status: "fail", detail: `${!titleNorm ? "Title" : "H1"} is missing — cannot evaluate uniqueness`, score: 0 });
  } else if (titleNorm === h1Norm) {
    results.push({ label: "Title / H1 Uniqueness", status: "warn", detail: "Title and H1 are identical — use distinct text to target more keywords", score: 55 });
  } else {
    results.push({ label: "Title / H1 Uniqueness", status: "pass", detail: "Title and H1 are distinct — good keyword diversity", score: 100 });
  }

  // 24. Redirect Chain
  const redirectCount = pageData.redirectChain?.length || 0;
  const redirectScore = redirectCount === 0 ? 100 : redirectCount === 1 ? 85 : redirectCount === 2 ? 55 : 25;
  results.push({
    label: "Redirect Chain",
    status: redirectScore >= 75 ? "pass" : redirectScore >= 45 ? "warn" : "fail",
    detail: redirectCount === 0
      ? "No redirect chain — direct URL resolution"
      : `${redirectCount} redirect(s) in chain — each hop adds latency and dilutes link equity`,
    score: redirectScore,
  });

  // 25. Modern Image Formats (WebP / AVIF)
  const allImages = pageData.images?.allItems || [];
  if (allImages.length === 0) {
    results.push({ label: "Modern Image Formats", status: "pass", detail: "No images found on page", score: 90 });
  } else if (allImages.length <= 2) {
    results.push({ label: "Modern Image Formats", status: "pass", detail: `${allImages.length} image(s) — too few to penalise format choice`, score: 90 });
  } else {
    const isModern = (img) => {
      const src = img.src || "";
      if (/\.(webp|avif)(\?|$)/i.test(src)) return true;
      if (/^data:image\/(webp|avif)/i.test(src)) return true;
      if (/[?&](f_auto|fm=(webp|avif))/i.test(src)) return true;
      return false;
    };
    const pictureSourceModern = (pageData.pictureElements || []).some(pe =>
      (pe.sources || []).some(s => /image\/(webp|avif)/i.test(s.type || ""))
    );
    let modernCount = allImages.filter(isModern).length;
    if (pictureSourceModern) modernCount = Math.max(modernCount, 1);
    const modernPct = (modernCount / allImages.length) * 100;
    const imgFmtScore = modernPct > 80 ? 100 : modernPct >= 50 ? 70 : modernPct >= 25 ? 45 : 25;
    results.push({
      label: "Modern Image Formats",
      status: imgFmtScore >= 75 ? "pass" : imgFmtScore >= 45 ? "warn" : "fail",
      detail: modernPct > 80
        ? `${modernCount}/${allImages.length} images use modern formats (WebP/AVIF)`
        : `Only ${modernCount}/${allImages.length} images use modern formats — convert to WebP/AVIF for better performance`,
      score: imgFmtScore,
    });
  }

  // 26. Responsive Images (srcset)
  const allImagesForSrcset = pageData.images?.allItems || [];
  const allSrcsetImages = allImagesForSrcset.filter(img => img.srcset && img.srcset.trim() !== "");
  if (allImagesForSrcset.length <= 2 && allSrcsetImages.length < allImagesForSrcset.length) {
    results.push({ label: "Responsive Images", status: "pass", detail: `${allImagesForSrcset.length} image(s) — too few to require srcset`, score: 90 });
  } else {
    const eligibleImages = allImagesForSrcset.filter(img => {
      const w = parseInt(img.width, 10);
      return !(w > 0 && w < 100);
    });
    if (eligibleImages.length === 0) {
      results.push({ label: "Responsive Images", status: "pass", detail: "All images are small decorative icons — srcset not required", score: 90 });
    } else {
      const withSrcset = eligibleImages.filter(img => img.srcset && img.srcset.trim() !== "").length;
      const srcsetPct = (withSrcset / eligibleImages.length) * 100;
      const srcsetScore = srcsetPct > 80 ? 100 : srcsetPct >= 50 ? 70 : srcsetPct >= 25 ? 45 : 25;
      results.push({
        label: "Responsive Images",
        status: srcsetScore >= 75 ? "pass" : srcsetScore >= 45 ? "warn" : "fail",
        detail: srcsetPct > 80
          ? `${withSrcset}/${eligibleImages.length} images have srcset — good responsive image support`
          : `Only ${withSrcset}/${eligibleImages.length} images have srcset — add srcset for responsive image delivery`,
        score: srcsetScore,
      });
    }
  }

  // 27. Schema Currency (deprecated schema types)
  if (shouldSkipCheck(pageData.pageType, "Schema Currency")) {
    results.push(naResult("Schema Currency", pageData.pageType));
  } else if ((pageData.jsonLd || []).length === 0) {
    results.push({ label: "Schema Currency", status: "na", detail: "Schema Currency N/A — no structured data found", score: 100 });
  } else {
    const jsonLdSchemas = pageData.jsonLd || [];
    // Collect all types, including @graph arrays
    const collectTypes = (schemas) => {
      const types = [];
      for (const schema of schemas) {
        if (schema["@graph"] && Array.isArray(schema["@graph"])) {
          types.push(...collectTypes(schema["@graph"]));
        }
        const t = schema["@type"];
        if (Array.isArray(t)) types.push(...t);
        else if (t) types.push(t);
      }
      return types;
    };
    const allTypes = collectTypes(jsonLdSchemas);
    // Check for gov/health context
    const pageUrl = pageData.url || "";
    const isGovOrHealth = /\.gov(\/|$)/i.test(pageUrl) ||
      allTypes.some(t => ["MedicalOrganization", "Hospital", "GovernmentOrganization"].includes(t));

    let schemaCurrencyScore = 100;
    let schemaCurrencyDetail = "No deprecated schema types found";

    if (allTypes.includes("SpecialAnnouncement")) {
      schemaCurrencyScore = 25;
      schemaCurrencyDetail = "SpecialAnnouncement schema is deprecated — remove it";
    } else if (allTypes.includes("HowTo")) {
      schemaCurrencyScore = 50;
      schemaCurrencyDetail = "HowTo rich results removed from mobile search (Sep 2023) but still valid for desktop";
    } else if (allTypes.includes("FAQPage") && !isGovOrHealth) {
      schemaCurrencyScore = 50;
      schemaCurrencyDetail = "FAQPage rich results restricted to government and health sites since Aug 2023 — this schema will not generate rich results for your site";
    }

    results.push({
      label: "Schema Currency",
      status: schemaCurrencyScore >= 75 ? "pass" : schemaCurrencyScore >= 45 ? "warn" : "fail",
      detail: schemaCurrencyDetail,
      score: schemaCurrencyScore,
    });
  }

  // 28. Schema Value Validity — validate datetime formats and required values in structured data
  if (shouldSkipCheck(pageData.pageType, "Schema Validity")) {
    results.push(naResult("Schema Validity", pageData.pageType));
  } else if ((pageData.jsonLdEntities || []).length === 0) {
    results.push({ label: "Schema Validity", status: "na", detail: "No structured data to validate", score: 100 });
  } else {
    const entities = pageData.jsonLdEntities || [];
    const dateProps = [
      "datePublished", "dateModified", "dateCreated", "uploadDate",
      "startDate", "endDate", "validFrom", "validThrough",
      "foundingDate", "birthDate", "deathDate", "expires",
    ];
    // ISO 8601 with timezone — supports optional fractional seconds (.\d+) emitted by
    // JavaScript's Date.prototype.toISOString(), e.g. 2026-05-16T13:12:19.685Z
    const isoWithTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    // Date only: 2025-06-01 (valid but missing time+tz)
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
    // ISO without timezone: 2025-06-01T00:00:00 (fractional seconds also allowed)
    const isoNoTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/;

    const issues = [];
    const walkEntities = (items) => {
      for (const entity of items) {
        if (!entity || typeof entity !== "object") continue;
        const type = entity["@type"] || "unknown";
        for (const prop of dateProps) {
          const val = entity[prop];
          if (!val || typeof val !== "string") continue;
          if (isoWithTz.test(val)) continue; // fully valid
          if (dateOnly.test(val)) {
            issues.push(`${type}.${prop}: "${val}" — missing time and timezone (use "${val}T00:00:00Z")`);
          } else if (isoNoTz.test(val)) {
            issues.push(`${type}.${prop}: "${val}" — missing timezone (append Z or +02:00)`);
          } else {
            issues.push(`${type}.${prop}: "${val}" — invalid datetime format`);
          }
        }
        if (Array.isArray(entity["@graph"])) walkEntities(entity["@graph"]);
      }
    };
    walkEntities(entities);

    if (issues.length === 0) {
      results.push({ label: "Schema Validity", status: "pass", detail: "All schema datetime values are valid ISO 8601 with timezone", score: 100 });
    } else if (issues.length <= 2) {
      results.push({ label: "Schema Validity", status: "warn", detail: `${issues.length} datetime issue(s) — Google requires ISO 8601 with timezone for rich results`, score: 55, items: issues });
    } else {
      results.push({ label: "Schema Validity", status: "fail", detail: `${issues.length} invalid datetime values — fix for rich result eligibility`, score: 25, items: issues });
    }
  }

  // 28b. Review Schema Integrity — detect suspicious / fake AggregateRating values
  // Fake review schema is a Google manual-action risk under the structured-data spam policy.
  // Heuristics: AggregateRating without supporting Review markup or visible testimonials,
  // suspiciously round ratingCount, or implausibly high ratingValue.
  if (shouldSkipCheck(pageData.pageType, "Review Schema Integrity")) {
    results.push(naResult("Review Schema Integrity", pageData.pageType));
  } else {
    const allEntities = pageData.jsonLdEntities || [];
    // Collect both standalone AggregateRating and nested aggregateRating on Product/Service/etc.
    const aggregateRatings = [];
    for (const e of allEntities) {
      if (!e || typeof e !== "object") continue;
      const type = Array.isArray(e["@type"]) ? e["@type"][0] : e["@type"];
      if (type === "AggregateRating") aggregateRatings.push({ ar: e, parentType: "AggregateRating" });
      if (e.aggregateRating && typeof e.aggregateRating === "object") {
        aggregateRatings.push({ ar: e.aggregateRating, parentType: type || "unknown" });
      }
    }

    if (aggregateRatings.length === 0) {
      // No ratings claimed — nothing to validate. Don't add a result.
    } else {
      const hasReviewSchema = allEntities.some(e => {
        if (!e) return false;
        const t = Array.isArray(e["@type"]) ? e["@type"][0] : e["@type"];
        if (t === "Review") return true;
        return !!e.review;
      });
      const blockquoteCount = pageData.blockquoteCount || 0;
      const visibleText = (pageData.visibleText || "").toLowerCase();
      const hasVisibleTestimonialLanguage = /\b(testimonial|review|customer|client says)\b/.test(visibleText);

      const issues = [];
      for (const { ar, parentType } of aggregateRatings) {
        const ratingValue = parseFloat(ar.ratingValue);
        const ratingCountRaw = ar.ratingCount ?? ar.reviewCount;
        const ratingCount = ratingCountRaw != null ? parseInt(ratingCountRaw, 10) : NaN;
        const bestRating = parseFloat(ar.bestRating || 5);

        // Heuristic 1: implausibly perfect rating with no supporting markup
        if (!isNaN(ratingValue) && !isNaN(bestRating)) {
          const pctOfBest = ratingValue / bestRating;
          if (pctOfBest >= 0.95 && !hasReviewSchema && blockquoteCount === 0 && !hasVisibleTestimonialLanguage) {
            issues.push(`${parentType}.aggregateRating: ratingValue=${ratingValue}/${bestRating} with no Review schema and no visible testimonials`);
          }
        }

        // Heuristic 2: rating count claimed but no supporting markup at all
        if (!isNaN(ratingCount) && ratingCount >= 10 && !hasReviewSchema && blockquoteCount === 0 && !hasVisibleTestimonialLanguage) {
          issues.push(`${parentType}.aggregateRating: ${ratingCount} ratings claimed but no Review schema or visible testimonials`);
        }

        // Heuristic 3: suspiciously round ratingCount (often a placeholder/fake number)
        if (!isNaN(ratingCount) && ratingCount >= 100) {
          const isVeryRound = ratingCount % 100 === 0 || (ratingCount % 50 === 0 && ratingCount <= 500);
          if (isVeryRound) {
            issues.push(`${parentType}.aggregateRating: ratingCount=${ratingCount} is a suspiciously round number — verify it's not placeholder data`);
          }
        }

        // Heuristic 4: large ratingCount with NO Review schema at all
        // Curated testimonials (3-5 blocks) are normal even with 100s of ratings,
        // but missing Review schema entirely means Google can't verify the AggregateRating.
        if (!isNaN(ratingCount) && ratingCount >= 50 && !hasReviewSchema) {
          issues.push(`${parentType}.aggregateRating: ${ratingCount} ratings claimed but no Review schema entries — Google requires Review markup to back up AggregateRating`);
        }
      }

      // Heuristic 5: "self-serving review" — LocalBusiness/Organization reviewing itself
      // Google's review-snippet docs (2024 update) explicitly disallow this for rich results.
      const selfServingTypes = ["LocalBusiness", "Organization", "ProfessionalService", "Restaurant", "Store"];
      for (const e of allEntities) {
        if (!e || typeof e !== "object") continue;
        const t = Array.isArray(e["@type"]) ? e["@type"][0] : e["@type"];
        if (selfServingTypes.includes(t) && e.aggregateRating) {
          issues.push(`${t} has self-serving aggregateRating — Google disallows businesses rating themselves and won't show rich results`);
        }
      }

      // Heuristic 6: multiple AggregateRating blocks targeting different items on one page
      // Google (2024): each page should have one clear review target.
      if (aggregateRatings.length > 1) {
        const targets = new Set();
        for (const { ar, parentType } of aggregateRatings) {
          const itemReviewed = ar.itemReviewed;
          const targetName = (itemReviewed && typeof itemReviewed === "object" ? itemReviewed.name : null) || parentType;
          if (targetName) targets.add(targetName);
        }
        if (targets.size > 1) {
          issues.push(`${aggregateRatings.length} AggregateRating blocks targeting ${targets.size} different items — Google requires one clear review target per page`);
        }
      }

      if (issues.length === 0) {
        results.push({
          label: "Review Schema Integrity",
          status: "pass",
          detail: `${aggregateRatings.length} AggregateRating block(s) found with supporting evidence`,
          score: 100,
        });
      } else {
        // Multiple red flags = high manual-action risk
        const score = issues.length >= 3 ? 15 : issues.length === 2 ? 30 : 45;
        results.push({
          label: "Review Schema Integrity",
          status: score < 45 ? "fail" : "warn",
          detail: `${issues.length} suspicious pattern(s) in AggregateRating — fake review schema is a Google manual-action risk`,
          score,
          items: issues.slice(0, 5),
        });
      }
    }
  }

  // 29. Mixed Content
  const pageUrlForMixed = pageData.url || "";
  if (!pageUrlForMixed.startsWith("https")) {
    results.push({ label: "Mixed Content", status: "pass", detail: "HTTP page — mixed content check not applicable", score: 85 });
  } else {
    const resources = pageData.resourceUrls || [];
    const mixedResources = resources.filter(r => {
      const rUrl = r.url || "";
      if (!rUrl.startsWith("http://")) return false;
      if (rUrl.startsWith("//")) return false;
      const rel = (r.rel || "").toLowerCase();
      if (rel === "dns-prefetch" || rel === "preconnect") return false;
      return true;
    });
    const mixedCount = mixedResources.length;
    const mixedScore = mixedCount === 0 ? 100 : mixedCount <= 2 ? 60 : mixedCount <= 5 ? 35 : 15;
    results.push({
      label: "Mixed Content",
      status: mixedScore >= 75 ? "pass" : mixedScore >= 45 ? "warn" : "fail",
      detail: mixedCount === 0
        ? "No mixed content — all resources served over HTTPS"
        : `${mixedCount} HTTP resource(s) on HTTPS page — browsers may block these`,
      score: mixedScore,
    });
  }

  // 29. AI Content Quality — detects low-quality AI-generated content patterns
  if (shouldSkipCheck(pageData.pageType, "AI Content Quality")) {
    results.push(naResult("AI Content Quality", pageData.pageType));
  } else {
    const visibleText = pageData.visibleText || "";
    const totalWords = visibleText.trim() ? visibleText.trim().split(/\s+/).length : 0;
    const htmlLang = (pageData.htmlLang || "").toLowerCase();

    // Guard clauses
    if (!visibleText || visibleText.trim() === "") {
      results.push({ label: "AI Content Quality", status: "pass", detail: "No visible text to assess AI content patterns", score: 85 });
    } else if (totalWords < 50) {
      results.push({ label: "AI Content Quality", status: "pass", detail: "Too little text to assess AI content patterns", score: 85 });
    } else if (htmlLang.startsWith("ja") || htmlLang.startsWith("zh") || htmlLang.startsWith("ko")) {
      results.push({ label: "AI Content Quality", status: "pass", detail: "AI content detection not yet supported for this language", score: 85 });
    } else {
      // English patterns (always included)
      const enPhrases = [
        "in today's fast-paced world",
        "play a significant role in shaping",
        "plays a significant role in shaping",
        "aims to explore",
        "notable works include",
        "it's important to note",
        "it's important to remember",
        "it is important to note",
        "it is important to remember",
        "navigating the complexities of",
        "delving into the intricacies of",
        "a testament to",
        "in the realm of",
        "it goes without saying",
        "when it comes to",
        "in an ever-evolving",
        "serves as a reminder",
        "offers a unique blend",
        "here's the kicker",
        "and here's the part most people miss",
        "at the end of the day",
      ];
      const enWords = [
        "delve", "delves", "delving",
        "tapestry",
        "landscape",
        "realm",
        "embark", "embarking",
        "showcasing",
        "remarked",
        "surpassing",
        "impacting",
        "pivotal",
        "intricate",
        "meticulous", "meticulously",
        "vibrant",
        "unparalleled",
        "underscore", "underscores",
        "harness", "harnessing",
        "leverage", "leveraging",
        "synergy",
        "paradigm",
        "holistic",
        "multifaceted",
        "groundbreaking",
        "cutting-edge",
        "game-changer",
        "revolutionary",
        "transformative",
        "seamless", "seamlessly",
        "robust",
        "streamline", "streamlining",
        "innovative",
        "comprehensive",
        "commendable",
        "testament",
        "accentuate",
        "pioneering",
        "trailblazing",
        "unleash", "unleashing",
        "versatile",
        "redefine", "redefining",
        "optimize",
        "scalable",
        "foster", "fostering",
        "garner",
        "arguably",
        "notably",
      ];

      // Language-specific patterns
      const nlPhrases = [
        "in de huidige snelle wereld",
        "het is belangrijk om op te merken",
        "aan het einde van de dag",
        "als het gaat om",
        "speelt een cruciale rol",
        "een testament van",
        "in het domein van",
        "het is vermeldenswaard",
      ];
      const nlWords = ["cruciaal", "essentieel", "baanbrekend", "naadloos", "innovatief", "optimaliseren", "benutten", "holistisch", "veelzijdig", "transformatief", "robuust", "schaalbaar", "pivoterend", "veelgelaagd", "pionierswerk"];

      const frPhrases = [
        "dans le monde d'aujourd'hui",
        "il est important de noter",
        "en fin de compte",
        "en ce qui concerne",
        "joue un rôle crucial",
        "un témoignage de",
        "dans le domaine de",
        "il convient de souligner",
      ];
      const frWords = ["incontournable", "innovant", "optimiser", "exploiter", "holistique", "paradigme", "pionnier", "polyvalent", "transformateur", "robuste", "évolutif", "crucial", "remarquable", "multifacette"];

      const dePhrases = [
        "in der heutigen schnelllebigen Welt",
        "es ist wichtig zu beachten",
        "am Ende des Tages",
        "wenn es um",
        "spielt eine entscheidende Rolle",
        "ein Zeugnis für",
        "im Bereich von",
        "es ist erwähnenswert",
      ];
      const deWords = ["grundlegend", "maßgeblich", "bahnbrechend", "nahtlos", "innovativ", "optimieren", "nutzen", "ganzheitlich", "vielseitig", "transformativ", "robust", "skalierbar", "wegweisend", "vielschichtig", "richtungsweisend"];

      const esPhrases = [
        "en el mundo actual",
        "es importante señalar",
        "al final del día",
        "cuando se trata de",
        "desempeña un papel crucial",
        "un testimonio de",
        "en el ámbito de",
        "cabe destacar",
      ];
      const esWords = ["crucial", "innovador", "optimizar", "aprovechar", "holístico", "paradigma", "pionero", "versátil", "transformador", "robusto", "escalable", "multifacético", "vanguardista", "integral"];

      // Determine applicable phrase/word lists
      let phrases = [...enPhrases];
      let words = [...enWords];

      if (htmlLang.startsWith("nl")) {
        phrases = [...nlPhrases, ...enPhrases];
        words = [...nlWords, ...enWords];
      } else if (htmlLang.startsWith("fr")) {
        phrases = [...frPhrases, ...enPhrases];
        words = [...frWords, ...enWords];
      } else if (htmlLang.startsWith("de")) {
        phrases = [...dePhrases, ...enPhrases];
        words = [...deWords, ...enWords];
      } else if (htmlLang.startsWith("es")) {
        phrases = [...esPhrases, ...enPhrases];
        words = [...esWords, ...enWords];
      }

      const lowerText = visibleText.toLowerCase();

      // Count phrase matches (case-insensitive substring search)
      let phraseMatches = 0;
      const flaggedItems = [];
      for (const phrase of phrases) {
        const phraseLower = phrase.toLowerCase();
        let idx = 0;
        while ((idx = lowerText.indexOf(phraseLower, idx)) !== -1) {
          phraseMatches++;
          if (flaggedItems.length < 3) flaggedItems.push(phrase);
          idx += phraseLower.length;
        }
      }

      // Count word matches (whole-word, case-insensitive)
      let wordMatches = 0;
      for (const word of words) {
        const regex = new RegExp(`\\b${word.replace(/-/g, "[-]")}\\b`, "gi");
        const matches = visibleText.match(regex);
        if (matches) {
          wordMatches += matches.length;
          if (flaggedItems.length < 3) flaggedItems.push(word);
        }
      }

      // Calculate density
      const aiSignalDensity = (phraseMatches * 3 + wordMatches) / totalWords * 1000;

      // Base score from density
      let aiScore;
      if (aiSignalDensity < 2) {
        aiScore = 100;
      } else if (aiSignalDensity <= 5) {
        aiScore = 75;
      } else if (aiSignalDensity <= 10) {
        aiScore = 45;
      } else {
        aiScore = 20;
      }

      // Structural penalties (English only)
      const isEnglish = htmlLang.startsWith("en") || (!htmlLang.startsWith("nl") && !htmlLang.startsWith("fr") && !htmlLang.startsWith("de") && !htmlLang.startsWith("es"));
      if (isEnglish) {
        // Em dash density
        const emDashMatches = (visibleText.match(/\u2014|\u2013|--/g) || []).length;
        const emDashDensity = emDashMatches / totalWords * 1000;
        if (emDashDensity > 8) aiScore -= 15;

        // Formal transitions density
        const transitionMatches = (visibleText.match(/\b(Moreover|Furthermore|Additionally|Subsequently|Consequently)\b/gi) || []).length;
        const transitionDensity = transitionMatches / totalWords * 1000;
        if (transitionDensity > 5) aiScore -= 10;
      }

      // Floor at 10
      aiScore = Math.max(10, aiScore);

      const aiStatus = aiScore >= 75 ? "pass" : aiScore >= 45 ? "warn" : "fail";
      const totalSignals = phraseMatches + wordMatches;
      const densityRounded = Math.round(aiSignalDensity * 10) / 10;

      let aiDetail;
      if (aiSignalDensity < 2) {
        aiDetail = "No significant AI writing patterns detected";
      } else if (aiSignalDensity <= 5) {
        aiDetail = `Minor generic phrasing detected (density: ${densityRounded}) — within acceptable range`;
      } else if (aiSignalDensity <= 10) {
        const top3 = flaggedItems.slice(0, 3).map(i => `'${i}'`).join(", ");
        aiDetail = `${totalSignals} AI writing patterns detected (density: ${densityRounded}) — flagged: ${top3}`;
      } else {
        const top3 = flaggedItems.slice(0, 3).map(i => `'${i}'`).join(", ");
        aiDetail = `${totalSignals} AI writing patterns detected (density: ${densityRounded}) — flagged: ${top3}. High risk of Google's helpful content demotion`;
      }

      results.push({ label: "AI Content Quality", status: aiStatus, detail: aiDetail, score: aiScore });
    }
  }

  // 30b. AI Disclosure — transparency about AI-assisted content
  // Only relevant when AI writing patterns are actually detected
  if (shouldSkipCheck(pageData.pageType, "AI Disclosure")) {
    results.push(naResult("AI Disclosure", pageData.pageType));
  } else {
    const aiQualityCheck = results.find(r => r.label === "AI Content Quality");
    const hasAiPatterns = aiQualityCheck && aiQualityCheck.score < 80;
    const text = (pageData.visibleText || "").toLowerCase();
    const patterns = [
      "written with ai", "ai-assisted", "ai-generated", "generated with ai",
      "created with ai", "written by ai", "assisted by ai", "ai assistance",
      "ai geschreven", "met ai gemaakt", "met behulp van ai",
    ];
    const match = patterns.find(p => text.includes(p));
    if (match) {
      results.push({
        label: "AI Disclosure",
        status: "pass",
        detail: "AI disclosure statement found — demonstrates transparency and editorial oversight",
        score: 100,
      });
    } else if (!hasAiPatterns) {
      // No AI patterns detected — disclosure not needed
      results.push({
        label: "AI Disclosure",
        status: "na",
        detail: "No AI writing patterns detected — AI disclosure not applicable",
        score: 100,
      });
    } else {
      results.push({
        label: "AI Disclosure",
        status: "warn",
        detail: "AI writing patterns detected but no disclosure found — add transparency about AI-assisted content for Google E-E-A-T compliance",
        score: 40,
      });
    }
  }

  // 30. Favicon & Icons
  const linkIcons = pageData.linkIcons || [];
  const hasFaviconLink = linkIcons.some(icon => {
    const rel = (icon.rel || "").toLowerCase();
    return rel.includes("icon") && !rel.includes("apple");
  });
  const hasAppleTouchIcon = linkIcons.some(icon => (icon.rel || "").toLowerCase().includes("apple-touch-icon"));
  const hasFaviconFallback = pageData.faviconExists === true;

  let faviconScore;
  let faviconDetail;
  if (hasFaviconLink && hasAppleTouchIcon) {
    faviconScore = 100;
    faviconDetail = "Favicon and apple-touch-icon both present";
  } else if (hasFaviconLink || hasAppleTouchIcon) {
    faviconScore = 75;
    faviconDetail = hasFaviconLink ? "Favicon found but no apple-touch-icon" : "apple-touch-icon found but no standard favicon";
  } else if (hasFaviconFallback) {
    faviconScore = 55;
    faviconDetail = "Only /favicon.ico fallback detected — add <link rel=\"icon\"> and apple-touch-icon";
  } else {
    faviconScore = 20;
    faviconDetail = "No favicon found — add a favicon for brand recognition in browser tabs and bookmarks";
  }
  results.push({
    label: "Favicon & Icons",
    status: faviconScore >= 75 ? "pass" : faviconScore >= 45 ? "warn" : "fail",
    detail: faviconDetail,
    score: faviconScore,
  });

  return results;
}

module.exports = { runSeoChecks };
