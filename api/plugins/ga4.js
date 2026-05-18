// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Google Analytics 4 Integration Plugin
 *
 * Handles OAuth2 flow, token management, and GA4 Data API fetching
 * during scans. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * env vars. Tokens are stored per-user in Supabase user_integrations table.
 */

const { google } = require("googleapis");
const { supabase } = require("../middleware/auth");
const { encrypt, decrypt } = require("../utils/crypto");
const { debug } = require("../utils/debug");
const { signState, verifyState, createDevTokenStore } = require("./oauth-utils");

const { URL } = require("url");

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];
const GA4_TIMEOUT_MS = 10000;

const devTokenStore = createDevTokenStore(".dev-ga4-tokens.json");

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_GA4_REDIRECT_URI || "http://localhost:3001/api/integrations/ga4/callback"
  );
}

/**
 * Generate the Google OAuth2 consent URL for GA4 access.
 */
function getGa4AuthUrl(userId) {
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
 * Fetches the user's GA4 properties via Analytics Admin API.
 */
async function handleGa4Callback(code, userId) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Fetch GA4 properties via Admin API (with pagination)
  const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: oauth2 });
  const properties = [];
  let pageToken;
  do {
    const { data } = await analyticsAdmin.accountSummaries.list({ pageToken });
    debug("GA4", "accountSummaries page:", JSON.stringify((data.accountSummaries || []).map(a => ({ account: a.displayName, properties: (a.propertySummaries || []).map(p => p.displayName) }))));
    for (const account of data.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        properties.push({
          id: prop.property,
          name: prop.displayName,
          account: account.displayName,
        });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  const row = {
    user_id: userId,
    provider: "ga4",
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token || ""),
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    property_url: properties.length === 1 ? properties[0].id : null,
    updated_at: new Date().toISOString(),
  };

  debug("GA4", "Saving tokens for user:", userId, "has refresh_token:", !!tokens.refresh_token);

  if (supabase) {
    const { error } = await supabase.from("user_integrations").upsert(row, { onConflict: "user_id,provider" });
    if (error) {
      console.error("[GA4] Failed to save tokens:", error.message, error.details);
      throw new Error(`Failed to save GA4 tokens: ${error.message}`);
    }
  } else {
    devTokenStore.set(userId, row);
  }

  return { properties, selected: properties.length === 1 ? properties[0].id : null };
}

/**
 * Load stored GA4 tokens for a user from Supabase.
 */
async function loadTokens(userId) {
  if (!supabase) {
    return devTokenStore.get(userId) || null;
  }
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "ga4")
    .maybeSingle();
  if (error) {
    console.error("[GA4] loadTokens error:", error.message, error.code);
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
    console.error("[GA4] Failed to decrypt stored tokens — user must reconnect");
    return null;
  }

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: stored.token_expiry ? new Date(stored.token_expiry).getTime() : undefined,
  });

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
          .eq("provider", "ga4");
      }
    } catch (err) {
      console.error("[GA4] Failed to persist refreshed token:", err.message);
    }
  });

  return { oauth2, propertyId: stored.property_url };
}

/**
 * Fetch traffic overview for the last 28 days.
 */
async function fetchTrafficOverview(analyticsData, propertyId) {
  const { data } = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    },
  });

  const row = data.rows?.[0];
  if (!row) return { sessions: 0, users: 0, pageviews: 0, bounceRate: 0, avgSessionDuration: 0 };

  return {
    sessions: parseInt(row.metricValues[0].value, 10) || 0,
    users: parseInt(row.metricValues[1].value, 10) || 0,
    pageviews: parseInt(row.metricValues[2].value, 10) || 0,
    bounceRate: Math.round(parseFloat(row.metricValues[3].value) * 10000) / 100,
    avgSessionDuration: Math.round(parseFloat(row.metricValues[4].value)),
  };
}

/**
 * Fetch top 10 pages by pageviews for the last 28 days.
 */
async function fetchTopPages(analyticsData, propertyId) {
  const { data } = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    },
  });

  return (data.rows || []).map((row) => ({
    path: row.dimensionValues[0].value,
    pageviews: parseInt(row.metricValues[0].value, 10) || 0,
    sessions: parseInt(row.metricValues[1].value, 10) || 0,
    bounceRate: Math.round(parseFloat(row.metricValues[2].value) * 10000) / 100,
    avgDuration: Math.round(parseFloat(row.metricValues[3].value)),
  }));
}

/**
 * Fetch traffic sources breakdown for the last 28 days.
 */
async function fetchTrafficSources(analyticsData, propertyId) {
  const { data } = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  });

  return (data.rows || []).map((row) => ({
    channel: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value, 10) || 0,
    users: parseInt(row.metricValues[1].value, 10) || 0,
  }));
}

/**
 * Generate analytics checks from GA4 data.
 * Returns array of { label, score, detail } matching the project check shape.
 */
function generateChecks(overview, topPages, trafficSources) {
  const checks = [];

  // 1. Bounce Rate Health
  const br = overview.bounceRate;
  if (br < 40) {
    checks.push({ label: "Bounce Rate Health", score: 85, detail: `Excellent bounce rate of ${br}%. Visitors are engaging well with your content.` });
  } else if (br <= 65) {
    checks.push({ label: "Bounce Rate Health", score: 55, detail: `Bounce rate of ${br}% is moderate. Consider improving page load speed, content relevance, and internal linking.` });
  } else {
    checks.push({ label: "Bounce Rate Health", score: 30, detail: `High bounce rate of ${br}%. Most visitors leave without interacting. Review landing page content and user experience.` });
  }

  // 2. Session Duration
  const dur = overview.avgSessionDuration;
  const durMin = Math.floor(dur / 60);
  const durSec = dur % 60;
  const durStr = `${durMin}m ${durSec}s`;
  if (dur > 120) {
    checks.push({ label: "Session Duration", score: 85, detail: `Average session duration of ${durStr} indicates strong engagement.` });
  } else if (dur >= 45) {
    checks.push({ label: "Session Duration", score: 55, detail: `Average session duration of ${durStr}. Consider adding more compelling content to keep visitors engaged longer.` });
  } else {
    checks.push({ label: "Session Duration", score: 30, detail: `Low average session duration of ${durStr}. Visitors aren't staying long — review content quality and page experience.` });
  }

  // 3. Traffic Diversity
  const totalSessions = trafficSources.reduce((sum, s) => sum + s.sessions, 0);
  const diverseChannels = trafficSources.filter((s) => totalSessions > 0 && (s.sessions / totalSessions) > 0.1);
  if (diverseChannels.length >= 3) {
    checks.push({ label: "Traffic Diversity", score: 85, detail: `Traffic comes from ${diverseChannels.length} significant channels. Good diversification reduces risk from algorithm changes.` });
  } else if (diverseChannels.length === 2) {
    checks.push({ label: "Traffic Diversity", score: 55, detail: `Only ${diverseChannels.length} channels drive significant traffic. Diversify with social, email, or paid channels to reduce dependency.` });
  } else {
    const dominant = trafficSources[0];
    const pct = totalSessions > 0 && dominant ? Math.round((dominant.sessions / totalSessions) * 100) : 0;
    checks.push({ label: "Traffic Diversity", score: 30, detail: `${dominant?.channel || "One channel"} dominates with ${pct}% of traffic. Heavy reliance on a single source is risky.` });
  }

  // 4. Organic Search Share
  const organicSource = trafficSources.find((s) => s.channel === "Organic Search");
  const organicPct = totalSessions > 0 && organicSource ? Math.round((organicSource.sessions / totalSessions) * 100) : 0;
  if (organicPct >= 40) {
    checks.push({ label: "Organic Search Share", score: 85, detail: `Organic search drives ${organicPct}% of traffic — strong SEO performance.` });
  } else if (organicPct >= 15) {
    checks.push({ label: "Organic Search Share", score: 55, detail: `Organic search is only ${organicPct}% of traffic. There's room to grow through content optimization and link building.` });
  } else {
    checks.push({ label: "Organic Search Share", score: 30, detail: `Organic search accounts for just ${organicPct}% of traffic. SEO efforts need significant improvement.` });
  }

  // 5. High Bounce Rate Pages
  const highBouncePgs = topPages.filter((p) => p.bounceRate > 70 && p.sessions > 50);
  if (highBouncePgs.length === 0) {
    checks.push({ label: "High Bounce Pages", score: 85, detail: "No high-traffic pages with excessive bounce rates detected." });
  } else if (highBouncePgs.length <= 2) {
    checks.push({ label: "High Bounce Pages", score: 55, detail: `${highBouncePgs.length} top page(s) have bounce rates above 70%. Worst: "${highBouncePgs[0].path}" at ${highBouncePgs[0].bounceRate}%.` });
  } else {
    checks.push({ label: "High Bounce Pages", score: 30, detail: `${highBouncePgs.length} top pages have bounce rates above 70%. Worst: "${highBouncePgs[0].path}" at ${highBouncePgs[0].bounceRate}%. Review content and UX on these pages.` });
  }

  // 6. Engagement Depth (pages per session)
  const pagesPerSession = overview.sessions > 0 ? overview.pageviews / overview.sessions : 0;
  const ppsRound = Math.round(pagesPerSession * 10) / 10;
  if (pagesPerSession > 2.5) {
    checks.push({ label: "Engagement Depth", score: 85, detail: `${ppsRound} pages per session shows strong content discoverability and internal linking.` });
  } else if (pagesPerSession >= 1.5) {
    checks.push({ label: "Engagement Depth", score: 55, detail: `${ppsRound} pages per session is average. Improve internal linking and related content suggestions.` });
  } else {
    checks.push({ label: "Engagement Depth", score: 30, detail: `Only ${ppsRound} pages per session. Visitors aren't exploring beyond their landing page. Add prominent internal links and CTAs.` });
  }

  return checks;
}

/**
 * Extract the hostname from a URL, stripping www. prefix for comparison.
 */
function extractDomain(urlStr) {
  try {
    const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if a GA4 property has a web data stream matching the given domain.
 * Returns true if any stream's defaultUri matches.
 */
async function propertyMatchesDomain(oauth2, propertyId, domain) {
  try {
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: oauth2 });
    const { data } = await analyticsAdmin.properties.dataStreams.list({ parent: propertyId });
    for (const stream of data.dataStreams || []) {
      if (stream.type === "WEB_DATA_STREAM" && stream.webStreamData?.defaultUri) {
        const streamDomain = extractDomain(stream.webStreamData.defaultUri);
        if (streamDomain === domain) return true;
      }
    }
  } catch (err) {
    console.error("[GA4] Failed to check data streams for", propertyId, err.message);
  }
  return false;
}

/**
 * Find a GA4 property that matches the scanned domain from the user's account.
 * Iterates all properties and checks their web data streams.
 */
async function findMatchingProperty(oauth2, scannedDomain) {
  try {
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: oauth2 });
    let pageToken;
    do {
      const { data } = await analyticsAdmin.accountSummaries.list({ pageToken });
      for (const account of data.accountSummaries || []) {
        for (const prop of account.propertySummaries || []) {
          if (await propertyMatchesDomain(oauth2, prop.property, scannedDomain)) {
            return prop.property;
          }
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error("[GA4] Failed to search properties:", err.message);
  }
  return null;
}

/**
 * Main GA4 analysis function — called during scan.
 * Returns structured GA4 data and checks, or null if not connected.
 * Only returns data when the scanned URL matches a GA4 property's web stream.
 */
async function analyzeGA4(scannedUrl, userId) {
  if (!userId) return null;
  if (!process.env.GOOGLE_CLIENT_ID) return null;

  try {
    const client = await getAuthenticatedClient(userId);
    if (!client) return null;

    const { oauth2 } = client;
    let { propertyId } = client;
    if (!propertyId) {
      return { available: false, reason: "no_property_selected" };
    }

    // Verify that the scanned URL matches the selected GA4 property
    const scannedDomain = extractDomain(scannedUrl);
    if (!scannedDomain) return null;

    const selectedMatches = await propertyMatchesDomain(oauth2, propertyId, scannedDomain);
    if (!selectedMatches) {
      // Selected property doesn't match — try to find one that does
      const matchingProperty = await findMatchingProperty(oauth2, scannedDomain);
      if (!matchingProperty) {
        return { available: false, reason: "no_matching_property" };
      }
      propertyId = matchingProperty;
    }

    const analyticsData = google.analyticsdata({ version: "v1beta", auth: oauth2 });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("GA4 API timeout")), GA4_TIMEOUT_MS)
    );

    const [overview, topPages, trafficSources] = await Promise.race([
      Promise.all([
        fetchTrafficOverview(analyticsData, propertyId),
        fetchTopPages(analyticsData, propertyId),
        fetchTrafficSources(analyticsData, propertyId),
      ]),
      timeoutPromise,
    ]);

    const checks = generateChecks(overview, topPages, trafficSources);

    // Fetch property name for display
    let propertyName = propertyId;
    try {
      const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: oauth2 });
      const { data } = await analyticsAdmin.properties.get({ name: propertyId });
      propertyName = data.displayName || propertyId;
    } catch {
      // Fall back to property ID
    }

    return {
      available: true,
      property: propertyId,
      propertyName,
      overview,
      topPages,
      trafficSources,
      checks,
    };
  } catch (err) {
    console.error("[GA4] Analysis failed:", err.message);
    return null;
  }
}

/**
 * Get connection status for the integrations view.
 * Returns the list of available GA4 properties when connected.
 */
async function getGa4Status(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return { connected: false, property: null, properties: [] };

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
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: oauth2 });
    let pageToken;
    do {
      const { data } = await analyticsAdmin.accountSummaries.list({ pageToken });
      console.log("[GA4] getGa4Status accountSummaries page:", JSON.stringify((data.accountSummaries || []).map(a => ({ account: a.displayName, properties: (a.propertySummaries || []).map(p => p.displayName) }))));
      for (const account of data.accountSummaries || []) {
        for (const prop of account.propertySummaries || []) {
          properties.push({
            id: prop.property,
            name: prop.displayName,
            account: account.displayName,
          });
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error("[GA4] Failed to fetch properties:", err.message);
  }

  return { connected: true, property: stored.property_url, properties };
}

/**
 * Update the selected GA4 property for a user.
 * Validates that the user actually has access to the property via Google API.
 */
async function setGa4Property(userId, propertyId) {
  // Verify the user owns this property before saving
  const client = await getAuthenticatedClient(userId);
  if (client) {
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: client.oauth2 });
    const owned = [];
    let pageToken;
    do {
      const { data } = await analyticsAdmin.accountSummaries.list({ pageToken });
      for (const account of data.accountSummaries || []) {
        for (const prop of account.propertySummaries || []) {
          owned.push(prop.property);
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    if (!owned.includes(propertyId)) {
      throw new Error("You do not have access to this property in Google Analytics");
    }
  }

  if (supabase) {
    await supabase
      .from("user_integrations")
      .update({ property_url: propertyId, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "ga4");
  } else {
    const stored = devTokenStore.get(userId);
    if (stored) {
      stored.property_url = propertyId;
      devTokenStore.set(userId, stored);
    }
  }
}

/**
 * Disconnect GA4 — removes stored tokens.
 */
async function disconnectGa4(userId) {
  if (!supabase) {
    devTokenStore.delete(userId);
    return;
  }
  await supabase.from("user_integrations").delete().eq("user_id", userId).eq("provider", "ga4");
}

module.exports = { analyzeGA4, getGa4AuthUrl, handleGa4Callback, getGa4Status, setGa4Property, disconnectGa4, verifyState, getAuthenticatedClient };
