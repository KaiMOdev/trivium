// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * CMS Detection Layer
 *
 * Fingerprints websites to identify their CMS/platform from HTML signals
 * and optional endpoint probes. Returns structured platform metadata
 * that downstream plugins can use for platform-specific analysis.
 */

/**
 * Known CMS fingerprints.
 * Each entry defines signals to look for in the parsed HTML.
 *   - generator: regex to match <meta name="generator"> content
 *   - htmlSignals: array of { selector, attr?, pattern? } to check in cheerio
 *   - headers: response header patterns (checked separately)
 *   - probeUrls: relative paths to probe for additional confirmation
 */
const CMS_FINGERPRINTS = {
  wordpress: {
    name: "WordPress",
    generator: /wordpress/i,
    htmlSignals: [
      { selector: 'link[rel="https://api.w.org/"]' },
      { selector: 'link[href*="wp-content"]' },
      { selector: 'script[src*="wp-includes"]' },
      { selector: 'script[src*="wp-content"]' },
      { selector: 'link[href*="wp-includes"]' },
      { selector: 'meta[name="generator"][content*="WooCommerce"]' },
    ],
    probeUrls: ["/wp-json/", "/wp-login.php"],
  },
  shopify: {
    name: "Shopify",
    generator: /shopify/i,
    htmlSignals: [
      { selector: 'link[href*="cdn.shopify.com"]' },
      { selector: 'script[src*="cdn.shopify.com"]' },
      { selector: 'meta[name="shopify-checkout-api-token"]' },
      { selector: 'input[name="shopify-checkout-api-token"]' },
    ],
    probeUrls: ["/products.json"],
  },
  wix: {
    name: "Wix",
    generator: /wix\.com/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Wix"]' },
      { selector: 'link[href*="parastorage.com"]' },
      { selector: 'link[href*="static.wixstatic.com"]' },
      { selector: 'script[src*="static.parastorage.com"]' },
    ],
    probeUrls: [],
  },
  squarespace: {
    name: "Squarespace",
    generator: /squarespace/i,
    htmlSignals: [
      { selector: 'link[href*="squarespace.com"]' },
      { selector: 'script[src*="squarespace.com"]' },
      { selector: 'link[rel="stylesheet"][href*="static1.squarespace.com"]' },
    ],
    probeUrls: [],
  },
  joomla: {
    name: "Joomla",
    generator: /joomla/i,
    htmlSignals: [
      { selector: 'script[src*="/media/jui/"]' },
      { selector: 'script[src*="/media/system/"]' },
      { selector: 'link[href*="/media/jui/"]' },
    ],
    probeUrls: ["/administrator/"],
  },
  drupal: {
    name: "Drupal",
    generator: /drupal/i,
    htmlSignals: [
      { selector: 'script[src*="/misc/drupal.js"]' },
      { selector: 'link[href*="/sites/default/files/"]' },
      { selector: 'meta[name="Generator"][content*="Drupal"]' },
      { selector: 'body.path-frontpage' },
    ],
    probeUrls: ["/core/install.php"],
  },
  webflow: {
    name: "Webflow",
    generator: /webflow/i,
    htmlSignals: [
      { selector: 'html[data-wf-site]' },
      { selector: 'script[src*="webflow.com"]' },
      { selector: 'link[href*="assets.website-files.com"]' },
    ],
    probeUrls: [],
  },
  ghost: {
    name: "Ghost",
    generator: /ghost/i,
    htmlSignals: [
      { selector: 'link[href*="ghost.io"]' },
      { selector: 'meta[name="generator"][content*="Ghost"]' },
      { selector: 'link[rel="amphtml"]' },
    ],
    probeUrls: ["/ghost/api/"],
  },
  hubspot: {
    name: "HubSpot CMS",
    generator: /hubspot/i,
    htmlSignals: [
      { selector: 'script[src*="js.hs-scripts.com"]' },
      { selector: 'script[src*="js.hubspot.com"]' },
      { selector: 'link[href*="hubspot.net"]' },
      { selector: 'meta[name="generator"][content*="HubSpot"]' },
    ],
    probeUrls: [],
  },
  magento: {
    name: "Magento",
    generator: /magento/i,
    htmlSignals: [
      { selector: 'script[src*="mage/"]' },
      { selector: 'script[type="text/x-magento-init"]' },
      { selector: 'link[href*="/static/version"]' },
      { selector: 'input[name="form_key"]' },
    ],
    probeUrls: [],
  },
  prestashop: {
    name: "PrestaShop",
    generator: /prestashop/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="PrestaShop"]' },
      { selector: 'script[src*="prestashop"]' },
      { selector: 'link[href*="prestashop"]' },
    ],
    probeUrls: [],
  },
  typo3: {
    name: "TYPO3",
    generator: /typo3/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="TYPO3"]' },
      { selector: 'script[src*="typo3"]' },
      { selector: 'link[href*="typo3"]' },
    ],
    probeUrls: [],
  },
  bigcommerce: {
    name: "BigCommerce",
    generator: /bigcommerce/i,
    htmlSignals: [
      { selector: 'script[src*="bigcommerce.com"]' },
      { selector: 'link[href*="bigcommerce.com"]' },
      { selector: 'script[src*="/stencil/"]' },
      { selector: 'meta[name="platform"][content="bigcommerce"]' },
    ],
    probeUrls: ["/cart.php"],
  },
  blogger: {
    name: "Blogger",
    generator: /blogger/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Blogger"]' },
      { selector: 'link[href*="blogger.com"]' },
      { selector: 'link[href*="blogspot.com"]' },
      { selector: 'script[src*="blogblog.com"]' },
    ],
    probeUrls: [],
  },
  weebly: {
    name: "Weebly",
    generator: /weebly/i,
    htmlSignals: [
      { selector: 'script[src*="weebly.com"]' },
      { selector: 'link[href*="editmysite.com"]' },
      { selector: 'div.weebly-footer' },
      { selector: 'script[src*="editmysite.com"]' },
    ],
    probeUrls: [],
  },
  duda: {
    name: "Duda",
    generator: /duda/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Duda"]' },
      { selector: 'script[src*="du-app.com"]' },
      { selector: 'link[href*="du-app.com"]' },
      { selector: 'script[src*="multiscreensite.com"]' },
    ],
    probeUrls: [],
  },
  jimdo: {
    name: "Jimdo",
    generator: /jimdo/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Jimdo"]' },
      { selector: 'script[src*="jimdo.com"]' },
      { selector: 'link[href*="jimdo.com"]' },
      { selector: 'script[src*="jimdoassets.com"]' },
    ],
    probeUrls: [],
  },
  tilda: {
    name: "Tilda",
    generator: /tilda/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Tilda"]' },
      { selector: 'script[src*="tildacdn.com"]' },
      { selector: 'link[href*="tildacdn.com"]' },
      { selector: 'div[id^="tildapage"]' },
    ],
    probeUrls: [],
  },
  cargo: {
    name: "Cargo",
    generator: /cargo/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Cargo"]' },
      { selector: 'link[href*="cargo.site"]' },
      { selector: 'script[src*="cargo.site"]' },
      { selector: '[data-cargo-component]' },
    ],
    probeUrls: [],
  },
  contentful: {
    name: "Contentful",
    generator: /contentful/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Contentful"]' },
      { selector: 'link[href*="ctfassets.net"]' },
      { selector: 'img[src*="ctfassets.net"]' },
      { selector: 'script[src*="contentful.com"]' },
    ],
    probeUrls: [],
  },
  storyblok: {
    name: "Storyblok",
    generator: /storyblok/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Storyblok"]' },
      { selector: 'script[src*="storyblok.com"]' },
      { selector: 'img[src*="a.storyblok.com"]' },
    ],
    probeUrls: [],
  },
  aem: {
    name: "Adobe Experience Manager",
    generator: /aem|adobe\s+experience/i,
    htmlSignals: [
      { selector: '[data-sly-use]' },
      { selector: '[data-cmp-data-layer]' },
      { selector: 'link[href*="/etc.clientlibs/"]' },
      { selector: 'script[src*="/etc.clientlibs/"]' },
      { selector: 'link[href*="/etc/designs/"]' },
      { selector: 'div[class*="cmp-"]' },
      { selector: 'meta[name="template"]' },
      { selector: 'link[href*="/content/dam/"]' },
    ],
    probeUrls: ["/libs/granite/core/content/login.html"],
  },
  sitecore: {
    name: "Sitecore",
    generator: /sitecore/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Sitecore"]' },
      { selector: 'script[src*="/sitecore/"]' },
      { selector: 'img[src*="/sitecore/"]' },
    ],
    probeUrls: ["/sitecore/login"],
  },
  umbraco: {
    name: "Umbraco",
    generator: /umbraco/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Umbraco"]' },
      { selector: 'script[src*="umbraco"]' },
      { selector: 'link[href*="umbraco"]' },
    ],
    probeUrls: ["/umbraco/"],
  },
  kentico: {
    name: "Kentico",
    generator: /kentico/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Kentico"]' },
      { selector: 'script[src*="CMSPages"]' },
      { selector: 'link[href*="CMSPages"]' },
      { selector: 'input[name="__CMSCsrfToken"]' },
    ],
    probeUrls: [],
  },
  craftcms: {
    name: "Craft CMS",
    generator: /craft\s?cms/i,
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Craft CMS"]' },
      { selector: 'script[src*="cpresources"]' },
      { selector: 'link[href*="cpresources"]' },
    ],
    probeUrls: ["/admin/login"],
  },
};

/**
 * Detect additional platform technologies (not the primary CMS,
 * but frameworks, e-commerce layers, and page builders).
 */
const TECH_FINGERPRINTS = {
  react: {
    name: "React",
    category: "framework",
    htmlSignals: [
      { selector: '[data-reactroot]' },
      { selector: '[data-reactid]' },
      { selector: '#__next' },
    ],
  },
  nextjs: {
    name: "Next.js",
    category: "framework",
    htmlSignals: [
      { selector: '#__next' },
      { selector: 'script[src*="/_next/"]' },
      { selector: 'link[href*="/_next/"]' },
    ],
  },
  nuxt: {
    name: "Nuxt",
    category: "framework",
    htmlSignals: [
      { selector: '#__nuxt' },
      { selector: 'script[src*="/_nuxt/"]' },
    ],
  },
  gatsby: {
    name: "Gatsby",
    category: "framework",
    htmlSignals: [
      { selector: '#___gatsby' },
      { selector: 'script[src*="/page-data/"]' },
    ],
  },
  woocommerce: {
    name: "WooCommerce",
    category: "ecommerce",
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="WooCommerce"]' },
      { selector: 'link[href*="woocommerce"]' },
      { selector: 'script[src*="woocommerce"]' },
      { selector: 'body.woocommerce' },
    ],
  },
  elementor: {
    name: "Elementor",
    category: "pagebuilder",
    htmlSignals: [
      { selector: 'link[href*="elementor"]' },
      { selector: '.elementor' },
      { selector: '[data-elementor-type]' },
    ],
  },
  divi: {
    name: "Divi",
    category: "pagebuilder",
    htmlSignals: [
      { selector: '#et-main-area' },
      { selector: '.et_pb_section' },
      { selector: 'link[href*="Divi"]' },
    ],
  },
  yoast: {
    name: "Yoast SEO",
    category: "seo",
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Yoast"]' },
      { selector: 'script[type="application/ld+json"].yoast-schema-graph' },
    ],
  },
  rankmath: {
    name: "Rank Math",
    category: "seo",
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Rank Math"]' },
    ],
  },
  aioseo: {
    name: "All in One SEO",
    category: "seo",
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="AIOSEO"]' },
      { selector: 'meta[name="generator"][content*="All in One SEO"]' },
    ],
  },
  // --- Frameworks ---
  vuejs: {
    name: "Vue.js",
    category: "framework",
    htmlSignals: [
      { selector: 'div#app[data-server-rendered]' },
      { selector: 'script[src*="vue.min.js"]' },
      { selector: 'script[src*="vue.global"]' },
      { selector: 'script[src*="/vue@"]' },
    ],
  },
  angular: {
    name: "Angular",
    category: "framework",
    htmlSignals: [
      { selector: 'app-root' },
      { selector: '[ng-version]' },
      { selector: 'script[src*="runtime."]' },
      { selector: 'script[src*="polyfills."]' },
    ],
  },
  svelte: {
    name: "SvelteKit",
    category: "framework",
    htmlSignals: [
      { selector: '[data-sveltekit-hydrate]' },
      { selector: 'body[data-sveltekit-preload-data]' },
      { selector: 'script[src*="/_app/"]' },
      { selector: 'link[href*="/_app/"]' },
    ],
  },
  remix: {
    name: "Remix",
    category: "framework",
    htmlSignals: [
      { selector: 'script[src*="__remix"]' },
      { selector: 'link[rel="modulepreload"][href*="/build/"]' },
      { selector: 'script[type="module"][src*="/build/"]' },
    ],
  },
  astro: {
    name: "Astro",
    category: "framework",
    htmlSignals: [
      { selector: 'meta[name="generator"][content*="Astro"]' },
      { selector: 'script[src*="/_astro/"]' },
      { selector: 'link[href*="/_astro/"]' },
      { selector: 'astro-island' },
    ],
  },
  // --- CSS Frameworks ---
  tailwindcss: {
    name: "Tailwind CSS",
    category: "css",
    htmlSignals: [
      { selector: 'link[href*="tailwind"]' },
      { selector: 'style[data-tailwind]' },
    ],
  },
  bootstrap: {
    name: "Bootstrap",
    category: "css",
    htmlSignals: [
      { selector: 'link[href*="bootstrap"]' },
      { selector: 'script[src*="bootstrap"]' },
      { selector: 'link[href*="bootstrapcdn.com"]' },
    ],
  },
  // --- Libraries ---
  jquery: {
    name: "jQuery",
    category: "library",
    htmlSignals: [
      { selector: 'script[src*="jquery"]' },
      { selector: 'script[src*="code.jquery.com"]' },
    ],
  },
  // --- Analytics ---
  gtm: {
    name: "Google Tag Manager",
    category: "analytics",
    htmlSignals: [
      { selector: 'script[src*="googletagmanager.com/gtm.js"]' },
      { selector: 'noscript iframe[src*="googletagmanager.com"]' },
    ],
  },
  ga4: {
    name: "Google Analytics",
    category: "analytics",
    htmlSignals: [
      { selector: 'script[src*="googletagmanager.com/gtag/js"]' },
      { selector: 'script[src*="google-analytics.com/analytics.js"]' },
      { selector: 'script[src*="google-analytics.com/ga.js"]' },
    ],
  },
  adobeAnalytics: {
    name: "Adobe Analytics",
    category: "analytics",
    htmlSignals: [
      { selector: 'script[src*="assets.adobedtm.com"]' },
      { selector: 'script[src*="AppMeasurement"]' },
      { selector: 'script[src*="s_code"]' },
    ],
  },
  // --- CDN / Hosting ---
  cloudflare: {
    name: "Cloudflare",
    category: "cdn",
    htmlSignals: [
      { selector: 'script[src*="cdnjs.cloudflare.com"]' },
      { selector: 'link[href*="cdnjs.cloudflare.com"]' },
      { selector: 'script[src*="challenges.cloudflare.com"]' },
      { selector: '[data-cf-beacon]' },
    ],
  },
  vercel: {
    name: "Vercel",
    category: "hosting",
    htmlSignals: [
      { selector: 'script[src*="va.vercel-scripts.com"]' },
      { selector: 'script[src*="vercel.app"]' },
      { selector: 'link[href*="vercel.app"]' },
    ],
  },
  netlify: {
    name: "Netlify",
    category: "hosting",
    htmlSignals: [
      { selector: 'script[src*="netlify"]' },
      { selector: 'link[href*="netlify"]' },
      { selector: 'script[src*="identity.netlify.com"]' },
    ],
  },
};

/**
 * Check if a cheerio document matches any signals for a fingerprint entry.
 * Returns the number of matched signals (0 = no match).
 */
function matchSignals($, signals) {
  let matches = 0;
  for (const sig of signals) {
    if ($(sig.selector).length > 0) {
      matches++;
    }
  }
  return matches;
}

/**
 * Extract generator meta tag content.
 */
function getGenerator($) {
  return $('meta[name="generator"]').attr("content")?.trim() || null;
}

/**
 * Extract version from generator string if present.
 */
function parseVersion(generatorContent, cmsName) {
  if (!generatorContent) return null;
  // Common pattern: "WordPress 6.5" or "Joomla! 4.3"
  const match = generatorContent.match(/[\d]+(?:\.[\d]+)*/);
  return match ? match[0] : null;
}

/**
 * Probe a URL to check if it responds (2xx or redirect).
 * Returns true if the endpoint exists.
 */
async function probeUrl(origin, path) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${origin}${path}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "Trivium/1.0 (open-source web audit tool)",
      },
    });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 400;
  } catch (err) {
    console.warn("[Detect] Probe failed:", err.message);
    return false;
  }
}

/**
 * Detect the CMS/platform for a page.
 *
 * @param {CheerioAPI} $ â€” cheerio-loaded document
 * @param {string} origin â€” site origin (e.g. "https://example.com")
 * @param {object} [options]
 * @param {boolean} [options.probe=true] â€” whether to probe known CMS endpoints
 * @returns {Promise<object>} detection result
 *
 * Return shape:
 * {
 *   cms: { id, name, version, confidence, signals } | null,
 *   technologies: [{ id, name, category }],
 *   generator: string | null,
 * }
 */
async function detectCMS($, origin, options = {}) {
  const probe = options.probe !== false;
  const generator = getGenerator($);

  // --- Score each CMS candidate ---
  const candidates = [];

  for (const [id, fp] of Object.entries(CMS_FINGERPRINTS)) {
    let confidence = 0;
    const matchedSignals = [];

    // Generator tag match is a strong signal
    if (generator && fp.generator.test(generator)) {
      confidence += 50;
      matchedSignals.push("generator");
    }

    // HTML selector matches
    const htmlMatches = matchSignals($, fp.htmlSignals);
    if (htmlMatches > 0) {
      confidence += Math.min(htmlMatches * 15, 45);
      matchedSignals.push(`${htmlMatches} html selector(s)`);
    }

    if (confidence > 0) {
      candidates.push({ id, fp, confidence, matchedSignals });
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  let cms = null;

  if (candidates.length > 0) {
    const best = candidates[0];

    // Optionally probe endpoints for extra confirmation
    if (probe && best.fp.probeUrls.length > 0 && best.confidence < 80) {
      const probes = await Promise.all(
        best.fp.probeUrls.map((path) => probeUrl(origin, path))
      );
      const probeHits = probes.filter(Boolean).length;
      if (probeHits > 0) {
        best.confidence += probeHits * 10;
        best.matchedSignals.push(`${probeHits} endpoint probe(s)`);
      }
    }

    const version = parseVersion(generator, best.fp.name);

    cms = {
      id: best.id,
      name: best.fp.name,
      version,
      confidence: Math.min(best.confidence, 100),
      signals: best.matchedSignals,
    };
  }

  // --- Detect additional technologies ---
  const technologies = [];
  for (const [id, fp] of Object.entries(TECH_FINGERPRINTS)) {
    const hits = matchSignals($, fp.htmlSignals);
    if (hits > 0) {
      technologies.push({
        id,
        name: fp.name,
        category: fp.category,
      });
    }
  }

  return { cms, technologies, generator };
}

module.exports = { detectCMS, CMS_FINGERPRINTS, TECH_FINGERPRINTS };
