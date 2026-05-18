// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Google Search Console Integration Plugin
 *
 * Handles OAuth2 flow, token management, and GSC data fetching
 * during scans. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * env vars. Tokens are stored per-user in Supabase user_integrations table.
 */

const { google } = require("googleapis");
const { supabase } = require("../middleware/auth");
const { encrypt, decrypt } = require("../utils/crypto");
const { debug } = require("../utils/debug");
const { signState, verifyState, createDevTokenStore } = require("./oauth-utils");

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];
const GSC_TIMEOUT_MS = 10000;

const devTokenStore = createDevTokenStore(".dev-gsc-tokens.json");

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/integrations/gsc/callback"
  );
}

/**
 * Generate the Google OAuth2 consent URL for GSC access.
 */
function getGscAuthUrl(userId) {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: signState(userId),
  });
}

/**
 * Exchange the OAuth2 authorization code for tokens and store them.
 * Also fetches the user's GSC properties and stores the best match.
 */
async function handleGscCallback(code, userId) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Fetch verified properties to store the first one
  const webmasters = google.webmasters({ version: "v3", auth: oauth2 });
  const { data } = await webmasters.sites.list();
  const properties = (data.siteEntry || []).map((s) => s.siteUrl);

  // Store tokens in Supabase (no property selected yet — user picks via UI)
  const row = {
    user_id: userId,
    provider: "gsc",
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token || ""),
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    property_url: properties.length === 1 ? properties[0] : null,
    updated_at: new Date().toISOString(),
  };

  debug("GSC", "Saving tokens for user:", userId, "has refresh_token:", !!tokens.refresh_token);

  if (supabase) {
    const { error } = await supabase.from("user_integrations").upsert(row, { onConflict: "user_id,provider" });
    if (error) {
      console.error("[GSC] Failed to save tokens:", error.message, error.details);
      throw new Error(`Failed to save GSC tokens: ${error.message}`);
    }
  } else {
    // Dev mode: store in memory
    devTokenStore.set(userId, row);
  }

  return { properties, selected: properties[0] || null };
}

/**
 * Load stored GSC tokens for a user from Supabase.
 */
async function loadTokens(userId) {
  if (!supabase) {
    // Dev mode: read from memory
    return devTokenStore.get(userId) || null;
  }
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "gsc")
    .maybeSingle();
  if (error) {
    console.error("[GSC] loadTokens error:", error.message, error.code);
  }
  return data || null;
}

/**
 * Create an authenticated OAuth2 client from stored tokens.
 * Automatically refreshes expired access tokens and writes them back.
 */
async function getAuthenticatedClient(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return null;

  const accessToken = decrypt(stored.access_token);
  const refreshToken = decrypt(stored.refresh_token);
  if (!accessToken && !refreshToken) {
    console.error("[GSC] Failed to decrypt stored tokens — user must reconnect");
    return null;
  }

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: stored.token_expiry ? new Date(stored.token_expiry).getTime() : undefined,
  });

  // Listen for token refresh events and persist new tokens
  oauth2.on("tokens", async (tokens) => {
    try {
      if (supabase) {
        await supabase
          .from("user_integrations")
          .update({
            access_token: encrypt(tokens.access_token),
            token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("provider", "gsc");
      }
    } catch (err) {
      console.error("[GSC] Failed to persist refreshed token:", err.message);
    }
  });

  return { oauth2, propertyUrl: stored.property_url };
}

/**
 * Match a scanned URL's origin against a stored GSC property.
 * Supports both URL-prefix ("https://example.com/") and domain ("sc-domain:example.com") properties.
 */
function matchesProperty(scannedUrl, propertyUrl) {
  if (!propertyUrl) return false;
  try {
    const hostname = new URL(scannedUrl).hostname.toLowerCase();
    const bare = hostname.replace(/^www\./, "");

    // Domain property: "sc-domain:example.com"
    if (propertyUrl.startsWith("sc-domain:")) {
      const domain = propertyUrl.replace("sc-domain:", "").toLowerCase();
      return bare === domain || hostname === domain || hostname.endsWith("." + domain);
    }

    // URL-prefix property: "https://example.com/"
    const propHost = new URL(propertyUrl).hostname.toLowerCase();
    const propBare = propHost.replace(/^www\./, "");
    return bare === propBare || hostname === propHost;
  } catch {
    return false;
  }
}

/**
 * Fetch search performance data (top queries and top pages) for the last 28 days.
 */
async function fetchSearchPerformance(webmasters, propertyUrl) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);

  const dateRange = {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };

  const [queriesRes, pagesRes] = await Promise.all([
    webmasters.searchanalytics.query({
      siteUrl: propertyUrl,
      requestBody: {
        ...dateRange,
        dimensions: ["query"],
        rowLimit: 10,
        dataState: "final",
      },
    }),
    webmasters.searchanalytics.query({
      siteUrl: propertyUrl,
      requestBody: {
        ...dateRange,
        dimensions: ["page"],
        rowLimit: 10,
        dataState: "final",
      },
    }),
  ]);

  const mapRow = (row) => ({
    key: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100,
    position: Math.round(row.position * 10) / 10,
  });

  const queries = (queriesRes.data.rows || []).map(mapRow);
  const pages = (pagesRes.data.rows || []).map(mapRow);

  // Aggregate totals
  const allQueries = queriesRes.data.rows || [];
  const totalClicks = allQueries.reduce((sum, r) => sum + r.clicks, 0);
  const totalImpressions = allQueries.reduce((sum, r) => sum + r.impressions, 0);
  const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;
  const avgPosition =
    allQueries.length > 0
      ? Math.round((allQueries.reduce((sum, r) => sum + r.position, 0) / allQueries.length) * 10) / 10
      : 0;

  return {
    totals: { clicks: totalClicks, impressions: totalImpressions, ctr: avgCtr, position: avgPosition },
    topQueries: queries,
    topPages: pages,
  };
}

/**
 * Fetch sitemap data (submitted vs indexed counts).
 */
async function fetchSitemaps(webmasters, propertyUrl) {
  try {
    const res = await webmasters.sitemaps.list({ siteUrl: propertyUrl });
    const sitemaps = res.data.sitemap || [];
    let submitted = 0;
    let indexed = 0;

    for (const sm of sitemaps) {
      for (const content of sm.contents || []) {
        submitted += parseInt(content.submitted, 10) || 0;
        indexed += parseInt(content.indexed, 10) || 0;
      }
    }

    return {
      count: sitemaps.length,
      submitted,
      indexed,
      coverage: submitted > 0 ? Math.round((indexed / submitted) * 100) : 0,
    };
  } catch {
    return { count: 0, submitted: 0, indexed: 0, coverage: 0 };
  }
}

/**
 * Generate SEO checks from GSC data.
 * Returns array of { label, score, detail } matching the project check shape.
 */
function generateChecks(performance, sitemaps) {
  const checks = [];

  // 1. Low CTR Detection
  const lowCtrPages = performance.topPages.filter((p) => p.impressions > 100 && p.ctr < 2);
  if (lowCtrPages.length > 0) {
    checks.push({
      label: "Low CTR Pages",
      score: 30,
      detail: `${lowCtrPages.length} page(s) have high impressions but CTR below 2%. Consider improving title tags and meta descriptions to increase click-through rate.`,
    });
  } else {
    checks.push({
      label: "Low CTR Pages",
      score: 85,
      detail: "No pages with high impressions and critically low CTR detected.",
    });
  }

  // 2. Position Opportunities (queries at positions 8-20 — page 1-2 boundary)
  const opportunities = performance.topQueries.filter((q) => q.position >= 8 && q.position <= 20);
  if (opportunities.length > 0) {
    const topOpp = opportunities[0];
    checks.push({
      label: "Position Opportunities",
      score: 55,
      detail: `${opportunities.length} query/queries ranking at positions 8–20. "${topOpp.key}" is at position ${topOpp.position} — a small boost could move it to page 1.`,
    });
  } else {
    checks.push({
      label: "Position Opportunities",
      score: 90,
      detail: "Top queries are already well-positioned (page 1).",
    });
  }

  // 3. Sitemap Coverage
  if (sitemaps.submitted > 0) {
    const gap = 100 - sitemaps.coverage;
    if (gap > 30) {
      checks.push({
        label: "Sitemap Coverage",
        score: 40,
        detail: `Only ${sitemaps.coverage}% of ${sitemaps.submitted} submitted URLs are indexed. ${gap}% gap suggests crawl or quality issues.`,
      });
    } else if (gap > 10) {
      checks.push({
        label: "Sitemap Coverage",
        score: 65,
        detail: `${sitemaps.coverage}% of submitted URLs are indexed. Minor gap of ${gap}% — review excluded pages.`,
      });
    } else {
      checks.push({
        label: "Sitemap Coverage",
        score: 90,
        detail: `Excellent sitemap coverage: ${sitemaps.coverage}% of ${sitemaps.submitted} URLs indexed.`,
      });
    }
  } else {
    checks.push({
      label: "Sitemap Coverage",
      score: 35,
      detail: "No sitemaps found in Google Search Console. Submit a sitemap to improve crawl efficiency.",
    });
  }

  // 4. Search Visibility
  const avgPos = performance.totals.position;
  if (avgPos > 30) {
    checks.push({
      label: "Search Visibility",
      score: 25,
      detail: `Average position is ${avgPos} — most content is buried beyond page 3. Focus on improving top-performing queries.`,
    });
  } else if (avgPos > 15) {
    checks.push({
      label: "Search Visibility",
      score: 55,
      detail: `Average position is ${avgPos}. Content appears on page 2–3 for most queries — there's room to improve.`,
    });
  } else {
    checks.push({
      label: "Search Visibility",
      score: 85,
      detail: `Good search visibility with an average position of ${avgPos}.`,
    });
  }

  // 5. CTR Benchmark — compare avg CTR against expected for position
  const avgCtr = performance.totals.ctr;
  // Expected CTR by position bucket (rough industry averages)
  let expectedCtr;
  if (avgPos <= 3) expectedCtr = 15;
  else if (avgPos <= 5) expectedCtr = 8;
  else if (avgPos <= 10) expectedCtr = 4;
  else expectedCtr = 2;

  if (avgCtr >= expectedCtr) {
    checks.push({
      label: "CTR Benchmark",
      score: 85,
      detail: `Average CTR of ${avgCtr}% meets or exceeds the expected ${expectedCtr}% for position ~${avgPos}.`,
    });
  } else {
    const ratio = avgCtr / expectedCtr;
    const score = Math.max(25, Math.round(ratio * 80));
    checks.push({
      label: "CTR Benchmark",
      score,
      detail: `Average CTR of ${avgCtr}% is below the expected ${expectedCtr}% for position ~${avgPos}. Improve snippets with better titles and descriptions.`,
    });
  }

  return checks;
}

/**
 * Main GSC analysis function — called during scan.
 * Returns structured GSC data and checks, or null if not connected.
 *
 * @param {string} scannedUrl — the URL being scanned
 * @param {string|null} userId — authenticated user ID
 * @returns {Promise<object|null>}
 */
async function analyzeGSC(scannedUrl, userId) {
  if (!userId) return null;
  if (!process.env.GOOGLE_CLIENT_ID) return null;

  try {
    const client = await getAuthenticatedClient(userId);
    if (!client) return null;

    const { oauth2, propertyUrl } = client;
    if (!propertyUrl) {
      return { available: false, reason: "no_property_selected" };
    }
    if (!matchesProperty(scannedUrl, propertyUrl)) {
      return { available: false, reason: "no_property_match" };
    }

    const webmasters = google.webmasters({ version: "v3", auth: oauth2 });

    // Fetch data in parallel with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("GSC API timeout")), GSC_TIMEOUT_MS)
    );

    const [performance, sitemaps] = await Promise.race([
      Promise.all([
        fetchSearchPerformance(webmasters, propertyUrl),
        fetchSitemaps(webmasters, propertyUrl),
      ]),
      timeoutPromise,
    ]);

    const checks = generateChecks(performance, sitemaps);

    return {
      available: true,
      property: propertyUrl,
      performance: performance.totals,
      topQueries: performance.topQueries,
      topPages: performance.topPages,
      sitemaps,
      checks,
    };
  } catch (err) {
    console.error("[GSC] Analysis failed:", err.message);
    return null;
  }
}

/**
 * Get connection status for the integrations view.
 * Also returns the list of available properties when connected.
 */
async function getGscStatus(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return { connected: false, property: null, properties: [] };

  // Fetch available properties from Google
  let properties = [];
  try {
    const at = decrypt(stored.access_token);
    const rt = decrypt(stored.refresh_token);
    if (!at && !rt) return { connected: true, property: stored.property_url, properties: [], error: "decrypt_failed" };

    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({
      access_token: at,
      refresh_token: rt,
      expiry_date: stored.token_expiry ? new Date(stored.token_expiry).getTime() : undefined,
    });
    const webmasters = google.webmasters({ version: "v3", auth: oauth2 });
    const { data } = await webmasters.sites.list();
    properties = (data.siteEntry || []).map((s) => s.siteUrl);
  } catch (err) {
    console.error("[GSC] Failed to fetch properties:", err.message);
  }

  return { connected: true, property: stored.property_url, properties };
}

/**
 * Update the selected GSC property for a user.
 * Validates that the user actually has access to the property via Google API.
 */
async function setGscProperty(userId, propertyUrl) {
  // Verify the user owns this property before saving
  const client = await getAuthenticatedClient(userId);
  if (client) {
    const webmasters = google.webmasters({ version: "v3", auth: client.oauth2 });
    const { data } = await webmasters.sites.list();
    const owned = (data.siteEntry || []).map((s) => s.siteUrl);
    if (!owned.includes(propertyUrl)) {
      throw new Error("You do not have access to this property in Google Search Console");
    }
  }

  if (supabase) {
    await supabase
      .from("user_integrations")
      .update({ property_url: propertyUrl, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "gsc");
  } else {
    const stored = devTokenStore.get(userId);
    if (stored) {
      stored.property_url = propertyUrl;
      devTokenStore.set(userId, stored);
    }
  }
}

/**
 * Disconnect GSC — removes stored tokens.
 */
async function disconnectGsc(userId) {
  if (!supabase) {
    devTokenStore.delete(userId);
    return;
  }
  await supabase.from("user_integrations").delete().eq("user_id", userId).eq("provider", "gsc");
}

module.exports = { analyzeGSC, getGscAuthUrl, handleGscCallback, getGscStatus, setGscProperty, disconnectGsc, verifyState };
