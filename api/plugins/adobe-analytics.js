// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Adobe Analytics Integration Plugin
 *
 * Handles OAuth2 flow via Adobe IMS, token management, and Adobe Analytics
 * 2.0 API data fetching during scans. Requires ADOBE_CLIENT_ID and
 * ADOBE_CLIENT_SECRET env vars. Tokens stored per-user in Supabase
 * user_integrations table.
 */

const { supabase } = require("../middleware/auth");
const { encrypt, decrypt } = require("../utils/crypto");
const { debug } = require("../utils/debug");
const { signState, verifyState, createDevTokenStore } = require("./oauth-utils");
const { URL } = require("url");

const ADOBE_AUTH_URL = "https://ims-na1.adobelogin.com/ims/authorize/v2";
const ADOBE_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3";
const ADOBE_ANALYTICS_API = "https://analytics.adobe.io";
const ADOBE_DISCOVERY_URL = "https://analytics.adobe.io/discovery/me";
const SCOPES = "openid,AdobeID,read_organizations,additional_info.projectedProductContext";
const ADOBE_TIMEOUT_MS = 10000;

// In-memory cache for company IDs (keyed by userId, 1-hour TTL).
// Company ID rarely changes, so caching avoids a Discovery API call on every scan.
const companyIdCache = new Map();
const COMPANY_CACHE_TTL_MS = 60 * 60 * 1000;

const devTokenStore = createDevTokenStore(".dev-adobe-analytics-tokens.json");

/**
 * Generate the Adobe IMS OAuth2 consent URL.
 */
function getAdobeAuthUrl(userId) {
  const redirectUri = process.env.ADOBE_REDIRECT_URI || "http://localhost:3001/api/integrations/adobe-analytics/callback";
  const params = new URLSearchParams({
    client_id: process.env.ADOBE_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    state: signState(userId),
  });
  return `${ADOBE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the OAuth2 authorization code for tokens and store them.
 * Fetches the user's report suites via Analytics Discovery API.
 */
async function handleAdobeCallback(code, userId) {
  const redirectUri = process.env.ADOBE_REDIRECT_URI || "http://localhost:3001/api/integrations/adobe-analytics/callback";

  // Exchange code for tokens
  const tokenRes = await fetch(ADOBE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ADOBE_CLIENT_ID,
      client_secret: process.env.ADOBE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Adobe token exchange failed: ${tokenRes.status} ${text}`);
  }

  const tokens = await tokenRes.json();
  const expiryDate = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Fetch company ID and report suites
  let reportSuites = [];
  let companyId = null;
  try {
    companyId = await fetchCompanyId(tokens.access_token, userId);
    if (companyId) {
      reportSuites = await fetchReportSuites(tokens.access_token, companyId);
    }
  } catch (err) {
    console.error("[Adobe Analytics] Failed to fetch report suites:", err.message);
  }

  const row = {
    user_id: userId,
    provider: "adobe_analytics",
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token || ""),
    token_expiry: expiryDate,
    property_url: reportSuites.length === 1 ? reportSuites[0].id : null,
    updated_at: new Date().toISOString(),
  };

  debug("Adobe Analytics", "Saving tokens for user:", userId, "has refresh_token:", !!tokens.refresh_token);

  if (supabase) {
    const { error } = await supabase.from("user_integrations").upsert(row, { onConflict: "user_id,provider" });
    if (error) {
      console.error("[Adobe Analytics] Failed to save tokens:", error.message, error.details);
      throw new Error(`Failed to save Adobe Analytics tokens: ${error.message}`);
    }
  } else {
    devTokenStore.set(userId, row);
  }

  return { reportSuites, selected: reportSuites.length === 1 ? reportSuites[0].id : null };
}

/**
 * Load stored Adobe Analytics tokens for a user.
 */
async function loadTokens(userId) {
  if (!supabase) {
    return devTokenStore.get(userId) || null;
  }
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "adobe_analytics")
    .maybeSingle();
  if (error) {
    console.error("[Adobe Analytics] loadTokens error:", error.message, error.code);
  }
  return data || null;
}

/**
 * Get an authenticated access token, refreshing if expired.
 * Returns { accessToken, reportSuiteId } or null.
 */
async function getAuthenticatedClient(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return null;

  let accessToken = decrypt(stored.access_token);
  if (!accessToken) {
    console.error("[Adobe Analytics] Failed to decrypt stored token — user must reconnect");
    return null;
  }

  // Check if token is expired and refresh if needed
  if (stored.token_expiry && new Date(stored.token_expiry).getTime() < Date.now()) {
    if (!stored.refresh_token) return null;

    try {
      const refreshRes = await fetch(ADOBE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.ADOBE_CLIENT_ID,
          client_secret: process.env.ADOBE_CLIENT_SECRET,
          refresh_token: decrypt(stored.refresh_token),
        }),
      });

      if (!refreshRes.ok) {
        console.error("[Adobe Analytics] Token refresh failed:", refreshRes.status);
        return null;
      }

      const newTokens = await refreshRes.json();
      accessToken = newTokens.access_token;
      const newExpiry = newTokens.expires_in
        ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
        : null;

      // Persist refreshed tokens
      if (supabase) {
        await supabase
          .from("user_integrations")
          .update({
            access_token: encrypt(accessToken),
            refresh_token: encrypt(newTokens.refresh_token || decrypt(stored.refresh_token)),
            token_expiry: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("provider", "adobe_analytics");
      } else {
        const devStored = devTokenStore.get(userId);
        if (devStored) {
          devStored.access_token = encrypt(accessToken);
          devStored.refresh_token = encrypt(newTokens.refresh_token || decrypt(devStored.refresh_token));
          devStored.token_expiry = newExpiry;
          devTokenStore.set(userId, devStored);
        }
      }
    } catch (err) {
      console.error("[Adobe Analytics] Token refresh error:", err.message);
      return null;
    }
  }

  return { accessToken, reportSuiteId: stored.property_url };
}

/**
 * Fetch the user's company ID from Adobe Discovery API (raw, uncached).
 */
async function fetchCompanyIdFromApi(accessToken) {
  const res = await fetch(ADOBE_DISCOVERY_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": process.env.ADOBE_CLIENT_ID,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  // Return the first company's globalCompanyId
  const company = data.imsOrgs?.[0]?.companies?.[0];
  return company?.globalCompanyId || null;
}

/**
 * Get company ID with in-memory cache (1-hour TTL).
 * Falls back to API if cache miss or expired.
 */
async function fetchCompanyId(accessToken, userId) {
  if (userId) {
    const cached = companyIdCache.get(userId);
    if (cached && Date.now() - cached.ts < COMPANY_CACHE_TTL_MS) {
      return cached.value;
    }
  }
  const companyId = await fetchCompanyIdFromApi(accessToken);
  if (userId && companyId) {
    companyIdCache.set(userId, { value: companyId, ts: Date.now() });
  }
  return companyId;
}

/**
 * Fetch available report suites for the user.
 */
async function fetchReportSuites(accessToken, companyId) {
  const res = await fetch(`${ADOBE_ANALYTICS_API}/api/${companyId}/reportsuites`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": process.env.ADOBE_CLIENT_ID,
      "x-proxy-global-company-id": companyId,
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.reportSuites || []).map((rs) => ({
    id: rs.rsid,
    name: rs.name || rs.rsid,
  }));
}

/**
 * Fetch page metrics for a scanned URL over the last 28 days.
 */
async function fetchPageMetrics(accessToken, companyId, rsid, scannedUrl) {
  const urlPath = new URL(scannedUrl).pathname;

  // Adobe Analytics 2.0 API requires segment-based filtering for page paths,
  // not itemId (which must be a numeric internal ID).
  const res = await fetch(`${ADOBE_ANALYTICS_API}/api/${companyId}/reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": process.env.ADOBE_CLIENT_ID,
      "x-proxy-global-company-id": companyId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rsid,
      globalFilters: [
        { type: "dateRange", dateRange: `${getDateRange28Days()}` },
        {
          type: "segment",
          segmentDefinition: {
            container: {
              func: "container",
              context: "hits",
              pred: {
                func: "streq",
                str: urlPath,
                val: { func: "attr", name: "variables/page" },
              },
            },
          },
        },
      ],
      metricContainer: {
        metrics: [
          { id: "metrics/pageviews" },
          { id: "metrics/visits" },
          { id: "metrics/bounceRate" },
          { id: "metrics/averageTimeSpentOnPage" },
          { id: "metrics/entries" },
        ],
      },
      dimension: "variables/daterangeday",
      settings: { limit: 50 },
    }),
  });

  if (!res.ok) {
    console.error("[Adobe Analytics] fetchPageMetrics failed:", res.status);
    return null;
  }

  const data = await res.json();
  const rows = data.rows || [];

  if (rows.length === 0) return null;

  // Aggregate across all days
  let pageviews = 0, visits = 0, bounceRateSum = 0, timeSum = 0, entries = 0;
  for (const row of rows) {
    const vals = row.data || [];
    pageviews += vals[0] || 0;
    visits += vals[1] || 0;
    bounceRateSum += vals[2] || 0;
    timeSum += vals[3] || 0;
    entries += vals[4] || 0;
  }

  return {
    pageviews: Math.round(pageviews),
    visits: Math.round(visits),
    bounceRate: rows.length > 0 ? Math.round((bounceRateSum / rows.length) * 100) / 100 : 0,
    avgTimeOnPage: rows.length > 0 ? Math.round(timeSum / rows.length) : 0,
    entries: Math.round(entries),
  };
}

/**
 * Fetch traffic sources (last touch channel) for the last 28 days.
 */
async function fetchTrafficSources(accessToken, companyId, rsid) {
  const res = await fetch(`${ADOBE_ANALYTICS_API}/api/${companyId}/reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": process.env.ADOBE_CLIENT_ID,
      "x-proxy-global-company-id": companyId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rsid,
      globalFilters: [
        { type: "dateRange", dateRange: `${getDateRange28Days()}` },
      ],
      metricContainer: {
        metrics: [
          { id: "metrics/visits" },
          { id: "metrics/visitors" },
        ],
      },
      dimension: "variables/lasttouchchannel",
      settings: { limit: 20 },
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows || []).map((row) => ({
    channel: row.value || "Unknown",
    visits: Math.round(row.data?.[0] || 0),
    visitors: Math.round(row.data?.[1] || 0),
  }));
}

/**
 * Generate a date range string for the last 28 days (ISO format).
 */
function getDateRange28Days() {
  const end = new Date();
  const start = new Date(end.getTime() - 28 * 24 * 60 * 60 * 1000);
  return `${start.toISOString().split("T")[0]}T00:00:00.000/${end.toISOString().split("T")[0]}T23:59:59.999`;
}

/**
 * Generate analytics checks from Adobe Analytics data.
 * Returns array of { label, score, detail } matching the project check shape.
 */
function generateChecks(metrics, trafficSources) {
  const checks = [];

  // 1. Bounce Rate Health
  const br = metrics.bounceRate;
  if (br < 40) {
    checks.push({ label: "Bounce Rate Health", score: 85, detail: `Excellent bounce rate of ${br}%. Visitors are engaging well with your content.` });
  } else if (br <= 65) {
    checks.push({ label: "Bounce Rate Health", score: 55, detail: `Bounce rate of ${br}% is moderate. Consider improving page load speed, content relevance, and internal linking.` });
  } else {
    checks.push({ label: "Bounce Rate Health", score: 30, detail: `High bounce rate of ${br}%. Most visitors leave without interacting. Review landing page content and user experience.` });
  }

  // 2. Time on Page
  const timeOnPage = metrics.avgTimeOnPage;
  const timeMin = Math.floor(timeOnPage / 60);
  const timeSec = timeOnPage % 60;
  const timeStr = `${timeMin}m ${timeSec}s`;
  if (timeOnPage > 120) {
    checks.push({ label: "Time on Page", score: 85, detail: `Average time on page of ${timeStr} indicates strong engagement.` });
  } else if (timeOnPage >= 45) {
    checks.push({ label: "Time on Page", score: 55, detail: `Average time on page of ${timeStr}. Consider adding more compelling content to keep visitors engaged longer.` });
  } else {
    checks.push({ label: "Time on Page", score: 30, detail: `Low average time on page of ${timeStr}. Visitors aren't staying long — review content quality and page experience.` });
  }

  // 3. Traffic Diversity
  const totalVisits = trafficSources.reduce((sum, s) => sum + s.visits, 0);
  const diverseChannels = trafficSources.filter((s) => totalVisits > 0 && (s.visits / totalVisits) > 0.1);
  if (diverseChannels.length >= 3) {
    checks.push({ label: "Traffic Diversity", score: 85, detail: `Traffic comes from ${diverseChannels.length} significant channels. Good diversification reduces risk from algorithm changes.` });
  } else if (diverseChannels.length === 2) {
    checks.push({ label: "Traffic Diversity", score: 55, detail: `Only ${diverseChannels.length} channels drive significant traffic. Diversify with social, email, or paid channels to reduce dependency.` });
  } else {
    const dominant = trafficSources[0];
    const pct = totalVisits > 0 && dominant ? Math.round((dominant.visits / totalVisits) * 100) : 0;
    checks.push({ label: "Traffic Diversity", score: 30, detail: `${dominant?.channel || "One channel"} dominates with ${pct}% of traffic. Heavy reliance on a single source is risky.` });
  }

  // 4. Page Engagement (pageviews per visit)
  const pagesPerVisit = metrics.visits > 0 ? metrics.pageviews / metrics.visits : 0;
  const ppvRound = Math.round(pagesPerVisit * 10) / 10;
  if (pagesPerVisit > 2.5) {
    checks.push({ label: "Page Engagement", score: 85, detail: `${ppvRound} pageviews per visit shows strong content discoverability and internal linking.` });
  } else if (pagesPerVisit >= 1.5) {
    checks.push({ label: "Page Engagement", score: 55, detail: `${ppvRound} pageviews per visit is average. Improve internal linking and related content suggestions.` });
  } else {
    checks.push({ label: "Page Engagement", score: 30, detail: `Only ${ppvRound} pageviews per visit. Visitors aren't exploring beyond their landing page.` });
  }

  // 5. Entry Rate
  const entryRate = metrics.pageviews > 0 ? Math.round((metrics.entries / metrics.pageviews) * 100) : 0;
  if (entryRate >= 30) {
    checks.push({ label: "Entry Rate", score: 85, detail: `${entryRate}% of pageviews are entry points — this page is a strong landing page for search traffic.` });
  } else if (entryRate >= 10) {
    checks.push({ label: "Entry Rate", score: 55, detail: `${entryRate}% entry rate is moderate. Optimize this page's meta tags and content for more direct search traffic.` });
  } else {
    checks.push({ label: "Entry Rate", score: 30, detail: `Low entry rate of ${entryRate}% — this page rarely serves as a landing page. Review SEO targeting.` });
  }

  return checks;
}

/**
 * Main Adobe Analytics analysis function — called during scan.
 * Returns structured data and checks, or null if not connected.
 */
async function analyzeAdobeAnalytics(scannedUrl, userId) {
  if (!userId) return null;
  if (!process.env.ADOBE_CLIENT_ID) return null;

  try {
    const client = await getAuthenticatedClient(userId);
    if (!client) return null;

    const { accessToken, reportSuiteId } = client;
    if (!reportSuiteId) {
      return { available: false, reason: "no_report_suite_selected" };
    }

    const companyId = await fetchCompanyId(accessToken, userId);
    if (!companyId) {
      return { available: false, reason: "no_company_found" };
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Adobe Analytics API timeout")), ADOBE_TIMEOUT_MS)
    );

    const [metrics, trafficSources] = await Promise.race([
      Promise.all([
        fetchPageMetrics(accessToken, companyId, reportSuiteId, scannedUrl),
        fetchTrafficSources(accessToken, companyId, reportSuiteId),
      ]),
      timeoutPromise,
    ]);

    // If no page-specific data was found, report as unavailable rather than
    // generating misleading zero-score checks
    if (!metrics) {
      return { available: false, reason: "no_data_for_page" };
    }

    const checks = generateChecks(metrics, trafficSources);

    return {
      available: true,
      reportSuite: reportSuiteId,
      overview: metrics,
      trafficSources,
      checks,
    };
  } catch (err) {
    console.error("[Adobe Analytics] Analysis failed:", err.message);
    return null;
  }
}

/**
 * Get connection status for the integrations view.
 */
async function getAdobeAnalyticsStatus(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return { connected: false, property: null, properties: [] };

  let reportSuites = [];
  try {
    const client = await getAuthenticatedClient(userId);
    if (client) {
      const companyId = await fetchCompanyId(client.accessToken, userId);
      if (companyId) {
        reportSuites = await fetchReportSuites(client.accessToken, companyId);
      }
    }
  } catch (err) {
    console.error("[Adobe Analytics] Failed to fetch report suites:", err.message);
  }

  return { connected: true, property: stored.property_url, properties: reportSuites };
}

/**
 * Update the selected report suite for a user.
 * Validates that the user has access to the report suite.
 */
async function setAdobeAnalyticsReportSuite(userId, rsid) {
  const client = await getAuthenticatedClient(userId);
  if (client) {
    const companyId = await fetchCompanyId(client.accessToken, userId);
    if (companyId) {
      const suites = await fetchReportSuites(client.accessToken, companyId);
      const owned = suites.map((s) => s.id);
      if (!owned.includes(rsid)) {
        throw new Error("You do not have access to this report suite in Adobe Analytics");
      }
    }
  }

  if (supabase) {
    await supabase
      .from("user_integrations")
      .update({ property_url: rsid, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "adobe_analytics");
  } else {
    const stored = devTokenStore.get(userId);
    if (stored) {
      stored.property_url = rsid;
      devTokenStore.set(userId, stored);
    }
  }
}

/**
 * Disconnect Adobe Analytics — removes stored tokens.
 */
async function disconnectAdobeAnalytics(userId) {
  companyIdCache.delete(userId);
  if (!supabase) {
    devTokenStore.delete(userId);
    return;
  }
  await supabase.from("user_integrations").delete().eq("user_id", userId).eq("provider", "adobe_analytics");
}

module.exports = {
  analyzeAdobeAnalytics,
  getAdobeAuthUrl,
  handleAdobeCallback,
  getAdobeAnalyticsStatus,
  setAdobeAnalyticsReportSuite,
  disconnectAdobeAnalytics,
  verifyState,
};
