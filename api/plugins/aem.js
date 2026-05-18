// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Adobe Experience Manager (AEM) Analysis Plugin
 *
 * When a site is detected as AEM, analyzes AEM-specific SEO configuration
 * from HTML signals. No authentication required â€” uses only publicly
 * visible indicators in the page HTML.
 */

const UA = "Trivium/1.0 (open-source web audit tool)";
const TIMEOUT_MS = 3000;

/**
 * Run AEM-specific analysis from HTML signals.
 *
 * @param {string} origin â€” site origin, e.g. "https://example.com"
 * @param {object} platform â€” detection result from detectCMS
 * @param {object} $ â€” cheerio instance of parsed HTML
 * @returns {Promise<object|null>} AEM insights or null if not AEM
 */
async function analyzeAEM(origin, platform, $) {
  if (!platform?.cms || platform.cms.id !== "aem") return null;

  const results = {
    available: true,
    edition: null,
    dispatcher: null,
    components: null,
    seo: null,
    checks: [],
  };

  // â”€â”€ Edition Detection â”€â”€
  const html = $.html();
  const isEdgeDelivery = html.includes("aem.page") || html.includes("aem.live") || html.includes("hlx.page") || html.includes("hlx.live");
  const hasGranite = $('script[src*="/libs/granite/"]').length > 0 || $('link[href*="/libs/granite/"]').length > 0;
  const hasCloudReady = $('meta[name="x-aem-version"]').length > 0;

  if (isEdgeDelivery) {
    results.edition = { type: "Edge Delivery Services", modern: true };
  } else if (hasCloudReady) {
    results.edition = { type: "AEM as a Cloud Service", modern: true };
  } else if (hasGranite) {
    results.edition = { type: "AEM On-Premise / Managed Services", modern: false };
  } else {
    results.edition = { type: "AEM (version unknown)", modern: false };
  }

  // â”€â”€ Dispatcher Detection â”€â”€
  // Note: We can only check HTML-level hints; actual headers require
  // the fetch response which isn't passed here. Check for common patterns.
  const hasDispatcherHints = html.includes("X-Dispatcher") || html.includes("dispatcher");
  results.dispatcher = {
    detected: hasDispatcherHints || !isEdgeDelivery, // Most AEM sites use dispatcher
    edgeDelivery: isEdgeDelivery,
  };

  // â”€â”€ Core Components Analysis â”€â”€
  const dataLayerElements = $("[data-cmp-data-layer]").length;
  const slyElements = $("[data-sly-use], [data-sly-test], [data-sly-list], [data-sly-repeat], [data-sly-resource]").length;
  const coreComponentClasses = $('[class*="cmp-"]').length;

  results.components = {
    coreComponents: dataLayerElements,
    htlTemplating: slyElements,
    cmpClasses: coreComponentClasses,
    usesDataLayer: dataLayerElements > 0,
  };

  // â”€â”€ SEO Configuration â”€â”€
  const contentPaths = $('a[href*="/content/"]').length;
  const damReferences = $('img[src*="/content/dam/"], source[srcset*="/content/dam/"], link[href*="/content/dam/"]').length;
  const totalImages = $("img").length;

  // ClientLib optimization check
  const clientLibs = $('link[href*="/etc.clientlibs/"], script[src*="/etc.clientlibs/"]');
  let minifiedClientLibs = 0;
  let unminifiedClientLibs = 0;
  clientLibs.each((_, el) => {
    const src = $(el).attr("href") || $(el).attr("src") || "";
    if (src.includes(".min.") || src.includes("/clientlib-") || src.includes("lc-")) {
      minifiedClientLibs++;
    } else {
      unminifiedClientLibs++;
    }
  });

  // Check for /content/ in public-facing URLs (common AEM misconfiguration)
  const publicContentUrls = $('a[href^="/content/"]').filter((_, el) => {
    const href = $(el).attr("href");
    // Exclude DAM paths â€” those are expected
    return href && !href.startsWith("/content/dam/");
  }).length;

  results.seo = {
    contentPathsExposed: publicContentUrls,
    damReferences,
    totalImages,
    clientLibsTotal: clientLibs.length,
    clientLibsMinified: minifiedClientLibs,
    clientLibsUnminified: unminifiedClientLibs,
  };

  // â”€â”€ Generate scored checks â”€â”€
  results.checks = generateChecks(results);

  return results;
}

/**
 * Generate scored check items from AEM analysis data.
 */
function generateChecks(data) {
  const checks = [];

  // 1. Core Components Usage
  const coreCount = data.components.coreComponents;
  if (coreCount >= 5) {
    checks.push({
      label: "AEM Core Components",
      score: 90,
      detail: `${coreCount} Core Component data-layer elements found â€” following Adobe best practices`,
    });
  } else if (coreCount >= 1) {
    checks.push({
      label: "AEM Core Components",
      score: 60,
      detail: `${coreCount} Core Component element(s) found â€” consider migrating more components to Core Components for better SEO and maintainability`,
    });
  } else {
    checks.push({
      label: "AEM Core Components",
      score: 30,
      detail: "No AEM Core Components detected â€” custom components may lack SEO best practices and data layer support",
    });
  }

  // 2. ClientLib Optimization
  const totalClientLibs = data.seo.clientLibsTotal;
  if (totalClientLibs === 0) {
    checks.push({
      label: "ClientLib Optimization",
      score: 70,
      detail: "No clientlibs detected in HTML â€” may use inline styles or external CDN",
    });
  } else if (data.seo.clientLibsUnminified === 0) {
    checks.push({
      label: "ClientLib Optimization",
      score: 90,
      detail: `All ${totalClientLibs} clientlib references appear minified â€” good for page load performance`,
    });
  } else {
    const unminPct = Math.round((data.seo.clientLibsUnminified / totalClientLibs) * 100);
    checks.push({
      label: "ClientLib Optimization",
      score: unminPct > 50 ? 30 : 55,
      detail: `${data.seo.clientLibsUnminified} of ${totalClientLibs} clientlibs appear unminified (${unminPct}%) â€” enable minification for production`,
    });
  }

  // 3. Content DAM Usage
  const { damReferences, totalImages } = data.seo;
  if (totalImages === 0) {
    checks.push({
      label: "Content DAM Usage",
      score: 50,
      detail: "No images found on page â€” consider adding visual content",
    });
  } else if (damReferences > 0) {
    const damPct = Math.round((damReferences / totalImages) * 100);
    if (damPct >= 50) {
      checks.push({
        label: "Content DAM Usage",
        score: 85,
        detail: `${damPct}% of images served from AEM DAM â€” centralized asset management enables optimization`,
      });
    } else {
      checks.push({
        label: "Content DAM Usage",
        score: 55,
        detail: `Only ${damPct}% of images from DAM â€” migrate assets to DAM for centralized optimization and delivery`,
      });
    }
  } else {
    checks.push({
      label: "Content DAM Usage",
      score: 40,
      detail: "No DAM references found â€” images may be hardcoded, missing centralized optimization",
    });
  }

  // 4. Dispatcher / CDN Caching
  if (data.dispatcher.edgeDelivery) {
    checks.push({
      label: "Dispatcher Caching",
      score: 90,
      detail: "Edge Delivery Services detected â€” built-in CDN with optimal caching",
    });
  } else if (data.dispatcher.detected) {
    checks.push({
      label: "Dispatcher Caching",
      score: 75,
      detail: "Dispatcher likely present â€” verify cache rules cover static assets and content pages",
    });
  } else {
    checks.push({
      label: "Dispatcher Caching",
      score: 35,
      detail: "No dispatcher indicators found â€” pages may be served uncached, impacting load times and SEO",
    });
  }

  // 5. SEO URL Structure
  const exposed = data.seo.contentPathsExposed;
  if (exposed === 0) {
    checks.push({
      label: "SEO URL Structure",
      score: 90,
      detail: "No /content/ paths exposed in public URLs â€” clean URL mapping configured",
    });
  } else if (exposed <= 3) {
    checks.push({
      label: "SEO URL Structure",
      score: 55,
      detail: `${exposed} link(s) expose /content/ paths â€” configure Sling mappings or rewrite rules to hide internal paths`,
    });
  } else {
    checks.push({
      label: "SEO URL Structure",
      score: 25,
      detail: `${exposed} links expose /content/ paths â€” internal AEM paths in URLs hurt SEO and user experience. Configure URL shortening via Sling mappings`,
    });
  }

  // 6. Cloud / Modern Architecture
  if (data.edition.modern) {
    checks.push({
      label: "Cloud Architecture",
      score: 90,
      detail: `${data.edition.type} â€” modern architecture with automatic scaling and performance optimization`,
    });
  } else {
    checks.push({
      label: "Cloud Architecture",
      score: 45,
      detail: `${data.edition.type} â€” consider migrating to AEM as a Cloud Service for automatic updates, better performance, and built-in CDN`,
    });
  }

  return checks;
}

module.exports = { analyzeAEM };
