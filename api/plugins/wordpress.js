// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * WordPress REST API Analysis Plugin
 *
 * When a site is detected as WordPress, fetches data from its public
 * REST API (/wp-json/wp/v2/) to generate WordPress-specific SEO insights.
 * No authentication required â€” uses only publicly exposed endpoints.
 */

const UA = "Trivium/1.0 (open-source web audit tool)";
const TIMEOUT_MS = 3000;

/**
 * Fetch JSON from a WordPress REST API endpoint.
 * Returns parsed JSON or null on failure.
 * If returnMeta is true, returns { data, total, totalPages } using WP headers.
 */
async function wpFetch(url, { returnMeta = false } = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return returnMeta ? { data: null, total: 0 } : null;
    const data = await res.json();
    if (returnMeta) {
      const total = parseInt(res.headers.get("X-WP-Total") || "0", 10);
      const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "0", 10);
      return { data, total, totalPages };
    }
    return data;
  } catch {
    return returnMeta ? { data: null, total: 0 } : null;
  }
}

/**
 * Run WordPress-specific analysis using the public REST API.
 *
 * @param {string} origin â€” site origin, e.g. "https://example.com"
 * @param {object} platform â€” detection result from detectCMS
 * @returns {Promise<object|null>} WordPress insights or null if unavailable
 */
async function analyzeWordPress(origin, platform) {
  // Only run for confirmed WordPress sites
  if (!platform?.cms || platform.cms.id !== "wordpress") return null;

  // 1. Fetch API root for site info + route discovery
  const apiRoot = await wpFetch(`${origin}/wp-json/`);
  if (!apiRoot) return null; // REST API not accessible

  const results = {
    available: true,
    site: null,
    content: null,
    taxonomy: null,
    seo: null,
    security: null,
    checks: [],
  };

  // â”€â”€ Site Info â”€â”€
  results.site = {
    name: apiRoot.name || null,
    description: apiRoot.description || null,
    url: apiRoot.url || origin,
    timezone: apiRoot.timezone_string || apiRoot.gmt_offset || null,
    namespaces: apiRoot.namespaces || [],
  };

  // â”€â”€ Parallel data fetches â”€â”€
  // Use returnMeta for posts/pages/media to get accurate totals from X-WP-Total header
  const [postsMeta, pagesMeta, categories, tags, users, mediaMeta] = await Promise.all([
    wpFetch(`${origin}/wp-json/wp/v2/posts?per_page=20&_fields=id,title,slug,date,modified,excerpt,content,featured_media,categories,tags,status`, { returnMeta: true }),
    wpFetch(`${origin}/wp-json/wp/v2/pages?per_page=100&_fields=id,title,slug,date,modified,excerpt,featured_media,status`, { returnMeta: true }),
    wpFetch(`${origin}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count,description,parent`),
    wpFetch(`${origin}/wp-json/wp/v2/tags?per_page=100&_fields=id,name,slug,count`),
    wpFetch(`${origin}/wp-json/wp/v2/users?per_page=20&_fields=id,name,slug,description`),
    wpFetch(`${origin}/wp-json/wp/v2/media?per_page=100&_fields=id,alt_text,source_url,media_type`, { returnMeta: true }),
  ]);
  const posts = postsMeta.data;
  const pages = pagesMeta.data;
  const media = mediaMeta.data;

  // â”€â”€ Content Health â”€â”€
  if (posts || pages) {
    const postList = Array.isArray(posts) ? posts : [];
    const pageList = Array.isArray(pages) ? pages : [];

    const postsNoExcerpt = postList.filter(
      (p) => !p.excerpt?.rendered || stripHtml(p.excerpt.rendered).trim().length < 10
    );
    const postsNoFeatured = postList.filter((p) => !p.featured_media);
    const pagesNoFeatured = pageList.filter((p) => !p.featured_media);

    // Publishing frequency
    let avgDaysBetween = null;
    if (postList.length >= 2) {
      const dates = postList.map((p) => new Date(p.date).getTime()).sort((a, b) => b - a);
      const gaps = [];
      for (let i = 0; i < dates.length - 1; i++) {
        gaps.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
      }
      avgDaysBetween = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
    }

    // Content freshness â€” most recent post
    const latestPost = postList[0];
    const daysSinceLastPost = latestPost
      ? Math.round((Date.now() - new Date(latestPost.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Content length analysis (word count from rendered content)
    const wordCounts = postList
      .map((p) => {
        const text = stripHtml(p.content?.rendered || "").trim();
        return text ? text.split(/\s+/).length : 0;
      })
      .filter((w) => w > 0);
    const avgWordCount = wordCounts.length > 0
      ? Math.round(wordCounts.reduce((s, w) => s + w, 0) / wordCounts.length)
      : null;
    const thinPosts = wordCounts.filter((w) => w < 300).length;

    // Permalink structure analysis
    const badSlugs = postList.filter((p) => {
      if (!p.slug) return false;
      // Flag slugs that are just numeric IDs or default patterns like "post-123"
      return /^\d+$/.test(p.slug) || /^post-\d+$/.test(p.slug) || /^p=\d+$/.test(p.slug);
    });

    // Content staleness â€” posts not modified recently
    const stalePosts = postList.filter((p) => {
      if (!p.modified) return false;
      const daysSinceModified = (Date.now() - new Date(p.modified).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceModified > 365;
    });

    results.content = {
      posts: postsMeta.total || postList.length,
      pages: pagesMeta.total || pageList.length,
      postsWithoutExcerpt: postsNoExcerpt.length,
      postsWithoutFeaturedImage: postsNoFeatured.length,
      pagesWithoutFeaturedImage: pagesNoFeatured.length,
      avgDaysBetweenPosts: avgDaysBetween,
      daysSinceLastPost,
      latestPostTitle: latestPost ? stripHtml(latestPost.title?.rendered || "") : null,
      latestPostDate: latestPost?.date || null,
      avgWordCount,
      thinPosts,
      badSlugs: badSlugs.length,
      stalePosts: stalePosts.length,
    };
  }

  // â”€â”€ Taxonomy Health â”€â”€
  if (categories || tags) {
    const catList = Array.isArray(categories) ? categories : [];
    const tagList = Array.isArray(tags) ? tags : [];

    const emptyCats = catList.filter((c) => c.count === 0 && c.slug !== "uncategorized");
    const emptyTags = tagList.filter((t) => t.count === 0);
    const catsNoDesc = catList.filter((c) => !c.description && c.slug !== "uncategorized");

    // Category depth analysis
    const catMap = new Map(catList.map((c) => [c.id, c]));
    let maxDepth = 0;
    for (const cat of catList) {
      let depth = 0;
      let current = cat;
      while (current.parent && catMap.has(current.parent) && depth < 10) {
        depth++;
        current = catMap.get(current.parent);
      }
      if (depth > maxDepth) maxDepth = depth;
    }

    results.taxonomy = {
      categories: catList.length,
      tags: tagList.length,
      emptyCategories: emptyCats.length,
      emptyTags: emptyTags.length,
      categoriesWithoutDescription: catsNoDesc.length,
      maxCategoryDepth: maxDepth,
    };
  }

  // â”€â”€ SEO Plugin Detection via REST API namespaces â”€â”€
  const namespaces = results.site.namespaces;
  const seoPlugin =
    namespaces.some((ns) => ns.startsWith("yoast")) ? "Yoast SEO"
    : namespaces.some((ns) => ns.startsWith("rankmath")) ? "Rank Math"
    : namespaces.some((ns) => ns.startsWith("aioseo")) ? "All in One SEO"
    : null;

  const hasWooCommerce = namespaces.some((ns) => ns.startsWith("wc/"));
  const hasJetpack = namespaces.some((ns) => ns.startsWith("jetpack"));

  results.seo = {
    plugin: seoPlugin,
    hasXmlSitemap: namespaces.some((ns) => ns.startsWith("yoast")) || namespaces.some((ns) => ns.startsWith("rankmath")),
    woocommerce: hasWooCommerce,
    jetpack: hasJetpack,
  };

  // â”€â”€ Security Posture â”€â”€
  const userList = Array.isArray(users) ? users : [];
  results.security = {
    usersExposed: userList.length > 0,
    userCount: userList.length,
    restApiFullyOpen: namespaces.length > 0,
    namespaceCount: namespaces.length,
  };

  // â”€â”€ Media Library (alt text analysis) â”€â”€
  const mediaList = Array.isArray(media) ? media : [];
  const images = mediaList.filter((m) => m.media_type === "image" || !m.media_type);
  const imagesNoAlt = images.filter((m) => !m.alt_text || m.alt_text.trim().length === 0);
  const mediaTotalFromHeader = mediaMeta.total || 0;
  results.media = {
    total: mediaTotalFromHeader || images.length,
    missingAlt: imagesNoAlt.length,
  };

  // â”€â”€ WooCommerce Products (if detected) â”€â”€
  if (hasWooCommerce) {
    const wooProducts = await wpFetch(`${origin}/wp-json/wc/store/v1/products?per_page=20`);
    const wooProductList = Array.isArray(wooProducts) ? wooProducts : [];
    if (wooProductList.length > 0) {
      const noImages = wooProductList.filter((p) => !p.images || p.images.length === 0);
      const noDescription = wooProductList.filter(
        (p) => !p.short_description && !p.description
      );
      const noPrices = wooProductList.filter(
        (p) => !p.prices?.price && !p.price
      );
      results.woocommerce = {
        products: wooProductList.length,
        missingImages: noImages.length,
        missingDescriptions: noDescription.length,
        missingPrices: noPrices.length,
      };
    }
  }

  // â”€â”€ Generate scored checks â”€â”€
  results.checks = generateChecks(results);

  return results;
}

/**
 * Generate scored check items from WordPress analysis data.
 */
function generateChecks(data) {
  const checks = [];

  // 1. SEO Plugin
  if (data.seo?.plugin) {
    checks.push({
      label: "SEO Plugin Active",
      score: 95,
      detail: `${data.seo.plugin} detected â€” REST API namespace registered`,
    });
  } else {
    checks.push({
      label: "SEO Plugin Active",
      score: 20,
      detail: "No SEO plugin detected (Yoast, Rank Math, or AIOSEO) â€” missing critical SEO features",
    });
  }

  // 2. Content Freshness
  if (data.content) {
    const days = data.content.daysSinceLastPost;
    if (days !== null) {
      if (days <= 7) {
        checks.push({ label: "Content Freshness", score: 95, detail: `Last post ${days} day(s) ago â€” excellent publishing cadence` });
      } else if (days <= 30) {
        checks.push({ label: "Content Freshness", score: 75, detail: `Last post ${days} days ago â€” good, but aim for weekly` });
      } else if (days <= 90) {
        checks.push({ label: "Content Freshness", score: 45, detail: `Last post ${days} days ago â€” content is going stale` });
      } else {
        checks.push({ label: "Content Freshness", score: 15, detail: `Last post ${days} days ago â€” stale content hurts rankings` });
      }
    }

    // 3. Publishing Frequency
    if (data.content.avgDaysBetweenPosts !== null) {
      const avg = data.content.avgDaysBetweenPosts;
      if (avg <= 7) {
        checks.push({ label: "Publishing Frequency", score: 90, detail: `Avg ${avg} day(s) between posts â€” strong cadence` });
      } else if (avg <= 14) {
        checks.push({ label: "Publishing Frequency", score: 70, detail: `Avg ${avg} days between posts â€” aim for weekly` });
      } else if (avg <= 30) {
        checks.push({ label: "Publishing Frequency", score: 50, detail: `Avg ${avg} days between posts â€” inconsistent schedule` });
      } else {
        checks.push({ label: "Publishing Frequency", score: 25, detail: `Avg ${avg} days between posts â€” very infrequent` });
      }
    }

    // 4. Post Excerpts
    if (data.content.posts > 0) {
      const missing = data.content.postsWithoutExcerpt;
      const total = data.content.posts;
      if (missing === 0) {
        checks.push({ label: "Post Excerpts", score: 95, detail: `All ${total} posts have excerpts â€” good for SEO snippets` });
      } else {
        const pct = Math.round(((total - missing) / total) * 100);
        checks.push({
          label: "Post Excerpts",
          score: Math.max(15, pct),
          detail: `${missing} of ${total} posts missing excerpts â€” auto-generated excerpts are less targeted`,
        });
      }
    }

    // 5. Featured Images
    if (data.content.posts > 0) {
      const missing = data.content.postsWithoutFeaturedImage;
      const total = data.content.posts;
      if (missing === 0) {
        checks.push({ label: "Featured Images", score: 95, detail: `All ${total} posts have featured images` });
      } else {
        const pct = Math.round(((total - missing) / total) * 100);
        checks.push({
          label: "Featured Images",
          score: Math.max(15, pct),
          detail: `${missing} of ${total} posts missing featured images â€” impacts social sharing and rich results`,
        });
      }
    }
  }

  // 6. Taxonomy Health
  if (data.taxonomy) {
    const { emptyCategories, emptyTags, categoriesWithoutDescription, categories } = data.taxonomy;
    if (emptyCategories === 0 && categoriesWithoutDescription === 0) {
      checks.push({ label: "Taxonomy Health", score: 90, detail: `${categories} categories â€” all populated with descriptions` });
    } else {
      const issues = [];
      if (emptyCategories > 0) issues.push(`${emptyCategories} empty categories`);
      if (categoriesWithoutDescription > 0) issues.push(`${categoriesWithoutDescription} categories without descriptions`);
      if (emptyTags > 0) issues.push(`${emptyTags} empty tags`);
      checks.push({
        label: "Taxonomy Health",
        score: emptyCategories + categoriesWithoutDescription > 3 ? 35 : 55,
        detail: issues.join(", ") + " â€” thin taxonomy pages can dilute SEO",
      });
    }
  }

  // 7. User Enumeration
  if (data.security) {
    if (data.security.usersExposed) {
      checks.push({
        label: "Author Enumeration",
        score: 35,
        detail: `${data.security.userCount} user(s) exposed via REST API â€” consider disabling for security`,
      });
    } else {
      checks.push({
        label: "Author Enumeration",
        score: 90,
        detail: "User endpoints restricted â€” good security practice",
      });
    }
  }

  // 8. REST API Exposure
  if (data.security) {
    const ns = data.security.namespaceCount;
    if (ns > 10) {
      checks.push({
        label: "REST API Exposure",
        score: 40,
        detail: `${ns} API namespaces publicly exposed â€” review and restrict unnecessary endpoints`,
      });
    } else if (ns > 5) {
      checks.push({
        label: "REST API Exposure",
        score: 65,
        detail: `${ns} API namespaces exposed â€” standard for WordPress with plugins`,
      });
    } else {
      checks.push({
        label: "REST API Exposure",
        score: 85,
        detail: `${ns} API namespaces exposed â€” minimal footprint`,
      });
    }
  }

  // 9. Content Length
  if (data.content?.avgWordCount !== null && data.content?.avgWordCount !== undefined) {
    const avg = data.content.avgWordCount;
    const thin = data.content.thinPosts;
    if (avg >= 1000) {
      checks.push({ label: "Content Length", score: 95, detail: `Avg ${avg} words/post â€” excellent depth for SEO` });
    } else if (avg >= 500) {
      checks.push({ label: "Content Length", score: 75, detail: `Avg ${avg} words/post â€” decent, aim for 1000+ on key pages` });
    } else if (avg >= 300) {
      checks.push({ label: "Content Length", score: 50, detail: `Avg ${avg} words/post â€” thin content, ${thin} post(s) under 300 words` });
    } else {
      checks.push({ label: "Content Length", score: 20, detail: `Avg ${avg} words/post â€” very thin content hurts rankings` });
    }
  }

  // 10. Permalink Structure
  if (data.content && data.content.posts > 0) {
    const bad = data.content.badSlugs;
    if (bad === 0) {
      checks.push({ label: "Permalink Structure", score: 90, detail: "All posts use readable SEO-friendly slugs" });
    } else {
      checks.push({
        label: "Permalink Structure",
        score: 30,
        detail: `${bad} post(s) with non-descriptive slugs (numeric/default) â€” update permalink settings`,
      });
    }
  }

  // 11. Category Depth
  if (data.taxonomy) {
    const depth = data.taxonomy.maxCategoryDepth;
    if (depth <= 2) {
      checks.push({ label: "Category Depth", score: 90, detail: `Max category nesting: ${depth} levels â€” clean hierarchy` });
    } else if (depth <= 3) {
      checks.push({ label: "Category Depth", score: 65, detail: `Max category nesting: ${depth} levels â€” consider flattening` });
    } else {
      checks.push({ label: "Category Depth", score: 35, detail: `Max category nesting: ${depth} levels â€” too deep, confuses crawlers and users` });
    }
  }

  // 12. Media Alt Text
  if (data.media && data.media.total > 0) {
    const { total, missingAlt } = data.media;
    if (missingAlt === 0) {
      checks.push({ label: "Image Alt Text", score: 95, detail: `All ${total} media library images have alt text` });
    } else {
      const pct = Math.round(((total - missingAlt) / total) * 100);
      checks.push({
        label: "Image Alt Text",
        score: Math.max(15, pct),
        detail: `${missingAlt} of ${total} images missing alt text â€” hurts accessibility and image SEO`,
      });
    }
  }

  // 13. Content Staleness
  if (data.content && data.content.posts > 0) {
    const stale = data.content.stalePosts;
    const total = data.content.posts;
    if (stale === 0) {
      checks.push({ label: "Content Staleness", score: 90, detail: `All ${total} recent posts updated within the last year` });
    } else {
      const pct = Math.round((stale / total) * 100);
      checks.push({
        label: "Content Staleness",
        score: pct > 50 ? 25 : 55,
        detail: `${stale} of ${total} posts not updated in over a year â€” review and refresh stale content`,
      });
    }
  }

  // 14. WooCommerce Products
  if (data.woocommerce) {
    const { products, missingImages, missingDescriptions, missingPrices } = data.woocommerce;
    const issues = [];
    if (missingImages > 0) issues.push(`${missingImages} without images`);
    if (missingDescriptions > 0) issues.push(`${missingDescriptions} without descriptions`);
    if (missingPrices > 0) issues.push(`${missingPrices} without prices`);
    if (issues.length === 0) {
      checks.push({ label: "WooCommerce Products", score: 90, detail: `${products} products â€” all have images, descriptions, and prices` });
    } else {
      checks.push({
        label: "WooCommerce Products",
        score: issues.length >= 3 ? 25 : issues.length >= 2 ? 40 : 55,
        detail: `${products} products: ${issues.join(", ")} â€” incomplete product data hurts conversions and rich results`,
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

module.exports = { analyzeWordPress };
