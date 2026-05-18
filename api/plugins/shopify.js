// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Shopify Analysis Plugin
 *
 * When a site is detected as Shopify, fetches data from its public
 * endpoints (/products.json, /collections, meta tags) to generate
 * Shopify-specific SEO and e-commerce insights.
 * No authentication required â€” uses only publicly exposed data.
 */

const UA = "Trivium/1.0 (open-source web audit tool)";
const TIMEOUT_MS = 8000;

/**
 * Fetch JSON from a Shopify endpoint.
 * Returns parsed JSON or null on failure.
 */
async function shopifyFetch(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Run Shopify-specific analysis using public endpoints and HTML signals.
 *
 * @param {string} origin â€” site origin, e.g. "https://example.com"
 * @param {object} platform â€” detection result from detectCMS
 * @param {CheerioAPI} $ â€” cheerio-loaded homepage document
 * @returns {Promise<object|null>} Shopify insights or null if not Shopify
 */
async function analyzeShopify(origin, platform, $) {
  // Only run for confirmed Shopify sites
  if (!platform?.cms || platform.cms.id !== "shopify") return null;

  const results = {
    available: true,
    store: null,
    products: null,
    collections: null,
    seo: null,
    ecommerce: null,
    checks: [],
  };

  // â”€â”€ Parallel data fetches â”€â”€
  const [productsData, collectionsPage, pagesData] = await Promise.all([
    shopifyFetch(`${origin}/products.json?limit=50`),
    shopifyFetch(`${origin}/collections.json`),
    shopifyFetch(`${origin}/pages.json`),
  ]);

  // â”€â”€ Store Info from HTML â”€â”€
  const storeName = $('meta[property="og:site_name"]').attr("content") || null;
  const storeDescription = $('meta[name="description"]').attr("content") || null;
  const currency = $('meta[property="og:price:currency"]').attr("content")
    || $('meta[property="product:price:currency"]').attr("content")
    || null;

  results.store = {
    name: storeName,
    description: storeDescription,
    url: origin,
    currency,
    hasCheckoutToken: $('meta[name="shopify-checkout-api-token"]').length > 0,
  };

  // â”€â”€ Products Analysis â”€â”€
  const productList = productsData?.products || [];
  if (productList.length > 0) {
    let missingImages = 0;
    let missingDescriptions = 0;
    let totalVariants = 0;
    let productsWithoutTags = 0;
    let productsWithoutType = 0;
    let productsWithoutVendor = 0;
    let singleImageProducts = 0;
    let imagesWithoutAlt = 0;
    let totalImages = 0;
    let thinDescriptions = 0;
    let badHandles = 0;
    let variantsWithComparePrice = 0;

    for (const product of productList) {
      const imgCount = product.images?.length || 0;
      if (imgCount === 0) missingImages++;
      else if (imgCount === 1) singleImageProducts++;

      // Image alt text
      for (const img of product.images || []) {
        totalImages++;
        if (!img.alt || img.alt.trim().length === 0) imagesWithoutAlt++;
      }

      const descText = stripHtml(product.body_html || "").trim();
      if (descText.length < 20) missingDescriptions++;
      else if (descText.split(/\s+/).length < 50) thinDescriptions++;

      if (!product.tags || product.tags.length === 0) productsWithoutTags++;
      if (!product.product_type) productsWithoutType++;
      if (!product.vendor || product.vendor === "Unknown" || product.vendor === product.handle) productsWithoutVendor++;

      const variants = product.variants || [];
      totalVariants += variants.length;

      // Check if handle is non-descriptive
      if (product.handle && /^\d+$/.test(product.handle)) badHandles++;

      // Check for compare_at_price (sale pricing)
      for (const v of variants) {
        if (v.compare_at_price && parseFloat(v.compare_at_price) > 0) {
          variantsWithComparePrice++;
        }
      }
    }

    results.products = {
      total: productList.length,
      missingImages,
      missingDescriptions,
      productsWithoutTags,
      productsWithoutType,
      productsWithoutVendor,
      singleImageProducts,
      thinDescriptions,
      badHandles,
      totalImages,
      imagesWithoutAlt,
      totalVariants,
      variantsWithComparePrice,
      avgVariantsPerProduct: productList.length > 0
        ? Math.round((totalVariants / productList.length) * 10) / 10
        : 0,
    };
  }

  // â”€â”€ Collections Analysis â”€â”€
  const collectionList = collectionsPage?.collections || [];
  if (collectionList.length > 0) {
    let missingDescriptions = 0;
    let missingImages = 0;

    for (const col of collectionList) {
      if (!col.body_html || col.body_html.trim().length < 20) missingDescriptions++;
      if (!col.image) missingImages++;
    }

    results.collections = {
      total: collectionList.length,
      missingDescriptions,
      missingImages,
    };
  }

  // â”€â”€ Pages Analysis â”€â”€
  const pageList = pagesData?.pages || [];
  if (pageList.length > 0) {
    let pagesWithoutContent = 0;
    let thinPages = 0;
    for (const page of pageList) {
      const text = stripHtml(page.body_html || "").trim();
      if (text.length < 20) pagesWithoutContent++;
      else if (text.split(/\s+/).length < 100) thinPages++;
    }
    results.pages = {
      total: pageList.length,
      withoutContent: pagesWithoutContent,
      thinPages,
    };
  }

  // â”€â”€ SEO Signals from HTML â”€â”€
  const ogTags = {
    title: $('meta[property="og:title"]').attr("content") || null,
    description: $('meta[property="og:description"]').attr("content") || null,
    image: $('meta[property="og:image"]').attr("content") || null,
    type: $('meta[property="og:type"]').attr("content") || null,
    url: $('meta[property="og:url"]').attr("content") || null,
  };
  const ogComplete = Object.values(ogTags).filter(Boolean).length;

  const hasCanonical = $('link[rel="canonical"]').length > 0;
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  const twitterCard = $('meta[name="twitter:card"]').attr("content") || null;

  results.seo = {
    ogTags,
    ogComplete,
    ogTotal: 5,
    hasCanonical,
    hasJsonLd,
    twitterCard,
  };

  // â”€â”€ E-commerce Schema Validation â”€â”€
  let schemaProducts = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data["@type"] === "Product" || data["@type"]?.includes?.("Product")) {
        schemaProducts.push(data);
      }
      if (Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
            schemaProducts.push(item);
          }
        }
      }
    } catch { /* invalid JSON-LD */ }
  });

  const schemaFields = ["name", "description", "image", "offers", "brand", "sku"];
  const schemaCompleteness = schemaProducts.length > 0
    ? schemaFields.filter((f) => schemaProducts[0][f]).length
    : 0;

  results.ecommerce = {
    schemaProductCount: schemaProducts.length,
    schemaCompleteness,
    schemaTotalFields: schemaFields.length,
    hasOffers: schemaProducts.some((p) => p.offers),
    hasReviews: schemaProducts.some((p) => p.aggregateRating || p.review),
    hasBrand: schemaProducts.some((p) => p.brand),
  };

  // â”€â”€ Generate scored checks â”€â”€
  results.checks = generateChecks(results);

  return results;
}

/**
 * Generate scored check items from Shopify analysis data.
 */
function generateChecks(data) {
  const checks = [];

  // 1. Product Descriptions
  if (data.products) {
    const { total, missingDescriptions } = data.products;
    if (missingDescriptions === 0) {
      checks.push({
        label: "Product Descriptions",
        score: 95,
        detail: `All ${total} products have descriptions â€” good for SEO and conversions`,
      });
    } else {
      const pct = Math.round(((total - missingDescriptions) / total) * 100);
      checks.push({
        label: "Product Descriptions",
        score: Math.max(15, pct),
        detail: `${missingDescriptions} of ${total} products missing descriptions â€” hurts product page SEO`,
      });
    }
  }

  // 2. Product Images
  if (data.products) {
    const { total, missingImages } = data.products;
    if (missingImages === 0) {
      checks.push({
        label: "Product Images",
        score: 95,
        detail: `All ${total} products have images â€” essential for conversions`,
      });
    } else {
      const pct = Math.round(((total - missingImages) / total) * 100);
      checks.push({
        label: "Product Images",
        score: Math.max(15, pct),
        detail: `${missingImages} of ${total} products missing images â€” impacts trust and rich results`,
      });
    }
  }

  // 3. Product Tags/Categorization
  if (data.products) {
    const { total, productsWithoutTags, productsWithoutType } = data.products;
    const missing = productsWithoutTags + productsWithoutType;
    if (missing === 0) {
      checks.push({
        label: "Product Categorization",
        score: 90,
        detail: `All ${total} products have tags and product types â€” good for filtering and SEO`,
      });
    } else {
      const issues = [];
      if (productsWithoutTags > 0) issues.push(`${productsWithoutTags} without tags`);
      if (productsWithoutType > 0) issues.push(`${productsWithoutType} without product type`);
      checks.push({
        label: "Product Categorization",
        score: missing > total ? 25 : 50,
        detail: issues.join(", ") + " â€” limits collection filtering and internal linking",
      });
    }
  }

  // 4. Collection Quality
  if (data.collections) {
    const { total, missingDescriptions, missingImages } = data.collections;
    if (missingDescriptions === 0 && missingImages === 0) {
      checks.push({
        label: "Collection Pages",
        score: 90,
        detail: `${total} collections â€” all have descriptions and images`,
      });
    } else {
      const issues = [];
      if (missingDescriptions > 0) issues.push(`${missingDescriptions} without descriptions`);
      if (missingImages > 0) issues.push(`${missingImages} without images`);
      checks.push({
        label: "Collection Pages",
        score: missingDescriptions > total / 2 ? 30 : 55,
        detail: issues.join(", ") + " â€” collection pages need unique content for SEO",
      });
    }
  }

  // 5. Open Graph Tags
  if (data.seo) {
    const { ogComplete, ogTotal } = data.seo;
    if (ogComplete >= ogTotal) {
      checks.push({ label: "Social Sharing Tags", score: 95, detail: "All Open Graph tags present â€” optimized for social sharing" });
    } else if (ogComplete >= 3) {
      checks.push({ label: "Social Sharing Tags", score: 65, detail: `${ogComplete}/${ogTotal} Open Graph tags set â€” missing ${ogTotal - ogComplete} tags` });
    } else {
      checks.push({ label: "Social Sharing Tags", score: 25, detail: `Only ${ogComplete}/${ogTotal} Open Graph tags â€” poor social sharing preview` });
    }
  }

  // 6. Product Schema (JSON-LD)
  if (data.ecommerce) {
    const { schemaProductCount, schemaCompleteness, schemaTotalFields, hasOffers, hasReviews } = data.ecommerce;
    if (schemaProductCount > 0 && schemaCompleteness >= schemaTotalFields - 1) {
      const bonus = hasReviews ? " + reviews" : "";
      checks.push({
        label: "Product Schema",
        score: hasReviews ? 95 : 85,
        detail: `Product JSON-LD with ${schemaCompleteness}/${schemaTotalFields} fields${bonus} â€” eligible for rich results`,
      });
    } else if (schemaProductCount > 0) {
      checks.push({
        label: "Product Schema",
        score: 50,
        detail: `Product schema present but only ${schemaCompleteness}/${schemaTotalFields} fields â€” add missing properties for rich results`,
      });
    } else {
      checks.push({
        label: "Product Schema",
        score: 15,
        detail: "No Product JSON-LD found â€” missing rich result eligibility for products",
      });
    }
  }

  // 7. Canonical URL
  if (data.seo) {
    if (data.seo.hasCanonical) {
      checks.push({ label: "Canonical URL", score: 90, detail: "Canonical tag present â€” prevents duplicate content issues" });
    } else {
      checks.push({ label: "Canonical URL", score: 30, detail: "No canonical tag found â€” Shopify variant URLs may cause duplicate content" });
    }
  }

  // 8. Twitter Card
  if (data.seo) {
    if (data.seo.twitterCard) {
      checks.push({ label: "Twitter Card", score: 85, detail: `Twitter card type: ${data.seo.twitterCard} â€” social previews enabled` });
    } else {
      checks.push({ label: "Twitter Card", score: 35, detail: "No Twitter card meta tag â€” missing social preview on X/Twitter" });
    }
  }

  // 9. Product Image Alt Text
  if (data.products && data.products.totalImages > 0) {
    const { totalImages, imagesWithoutAlt } = data.products;
    if (imagesWithoutAlt === 0) {
      checks.push({ label: "Product Image Alt Text", score: 95, detail: `All ${totalImages} product images have alt text â€” good for image SEO and accessibility` });
    } else {
      const pct = Math.round(((totalImages - imagesWithoutAlt) / totalImages) * 100);
      checks.push({
        label: "Product Image Alt Text",
        score: Math.max(15, pct),
        detail: `${imagesWithoutAlt} of ${totalImages} product images missing alt text â€” hurts image search visibility`,
      });
    }
  }

  // 10. Product Image Count
  if (data.products) {
    const { total, missingImages, singleImageProducts } = data.products;
    const multiImage = total - missingImages - singleImageProducts;
    if (missingImages === 0 && singleImageProducts <= total * 0.2) {
      checks.push({ label: "Product Image Depth", score: 90, detail: `${multiImage} of ${total} products have multiple images â€” boosts buyer confidence` });
    } else if (singleImageProducts > 0) {
      checks.push({
        label: "Product Image Depth",
        score: singleImageProducts > total / 2 ? 35 : 55,
        detail: `${singleImageProducts} product(s) with only 1 image â€” multiple angles increase conversions 20-30%`,
      });
    }
  }

  // 11. Description Quality
  if (data.products) {
    const { total, thinDescriptions, missingDescriptions } = data.products;
    const good = total - missingDescriptions - thinDescriptions;
    if (thinDescriptions === 0 && missingDescriptions === 0) {
      checks.push({ label: "Description Quality", score: 90, detail: `All ${total} products have substantial descriptions (50+ words)` });
    } else if (thinDescriptions > 0) {
      checks.push({
        label: "Description Quality",
        score: thinDescriptions > total / 2 ? 30 : 55,
        detail: `${thinDescriptions} product(s) with thin descriptions (under 50 words) â€” longer descriptions rank better`,
      });
    }
  }

  // 12. Product Vendor/Brand
  if (data.products) {
    const { total, productsWithoutVendor } = data.products;
    if (productsWithoutVendor === 0) {
      checks.push({ label: "Product Vendor", score: 90, detail: `All ${total} products have a vendor/brand set â€” enables brand filtering and schema` });
    } else {
      checks.push({
        label: "Product Vendor",
        score: productsWithoutVendor > total / 2 ? 30 : 55,
        detail: `${productsWithoutVendor} of ${total} products missing vendor â€” brand data strengthens rich results`,
      });
    }
  }

  // 13. Page Content Quality
  if (data.pages) {
    const { total, withoutContent, thinPages } = data.pages;
    if (withoutContent === 0 && thinPages === 0) {
      checks.push({ label: "Store Pages", score: 90, detail: `All ${total} pages have substantial content` });
    } else {
      const issues = [];
      if (withoutContent > 0) issues.push(`${withoutContent} empty`);
      if (thinPages > 0) issues.push(`${thinPages} thin (under 100 words)`);
      checks.push({
        label: "Store Pages",
        score: withoutContent + thinPages > total / 2 ? 25 : 50,
        detail: `${total} pages: ${issues.join(", ")} â€” About, FAQ, Shipping pages need real content for SEO`,
      });
    }
  }

  // 14. Product URL Handles
  if (data.products) {
    const { total, badHandles } = data.products;
    if (badHandles === 0) {
      checks.push({ label: "Product URLs", score: 90, detail: `All ${total} products have descriptive URL handles` });
    } else {
      checks.push({
        label: "Product URLs",
        score: 30,
        detail: `${badHandles} product(s) with numeric-only URL handles â€” use descriptive slugs for SEO`,
      });
    }
  }

  return checks;
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

module.exports = { analyzeShopify };
