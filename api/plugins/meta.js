// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Meta Business Integration Plugin
 *
 * Handles OAuth2 flow via Facebook Login, token management, and Meta Graph API
 * data fetching during scans. Requires META_APP_ID and META_APP_SECRET env vars.
 * Tokens stored per-user in Supabase user_integrations table.
 */

const { supabase } = require("../middleware/auth");
const { encrypt, decrypt } = require("../utils/crypto");
const { debug } = require("../utils/debug");
const { signState, verifyState, createDevTokenStore } = require("./oauth-utils");

const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const META_GRAPH_URL = "https://graph.facebook.com/v21.0";
const SCOPES = "pages_show_list,pages_read_engagement,ads_read";
const META_TIMEOUT_MS = 10000;
const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const devTokenStore = createDevTokenStore(".dev-meta-tokens.json");

function getMetaAuthUrl(userId) {
  const redirectUri = process.env.META_REDIRECT_URI || "http://localhost:3001/api/integrations/meta/callback";
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    state: signState(userId),
  });
  return `${META_AUTH_URL}?${params.toString()}`;
}

async function handleMetaCallback(code, userId) {
  const redirectUri = process.env.META_REDIRECT_URI || "http://localhost:3001/api/integrations/meta/callback";

  // Exchange code for short-lived token
  const tokenParams = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
  const tokenRes = await fetch(`${META_TOKEN_URL}?${tokenParams.toString()}`);
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Meta token exchange failed: ${tokenRes.status} ${text}`);
  }
  const shortLived = await tokenRes.json();

  // Exchange short-lived token for long-lived token (~60 days)
  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortLived.access_token,
  });
  const longRes = await fetch(`${META_TOKEN_URL}?${longLivedParams.toString()}`);
  if (!longRes.ok) {
    const text = await longRes.text();
    throw new Error(`Meta long-lived token exchange failed: ${longRes.status} ${text}`);
  }
  const longLived = await longRes.json();

  const expiryDate = longLived.expires_in
    ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
    : null;

  // Fetch user's Facebook Pages
  let pages = [];
  try {
    const pagesRes = await fetch(`${META_GRAPH_URL}/me/accounts?fields=name,id,fan_count`, {
      headers: { Authorization: `Bearer ${longLived.access_token}` },
    });
    const pagesData = await pagesRes.json();
    console.log("[Meta] /me/accounts response:", JSON.stringify(pagesData));
    if (pagesRes.ok) {
      pages = (pagesData.data || []).map((p) => ({ id: p.id, name: p.name, followers: p.fan_count || 0 }));
      console.log("[Meta] Pages found:", pages.length, pages.map((p) => p.name).join(", "));
    } else {
      console.error("[Meta] /me/accounts failed:", pagesData.error?.message || pagesRes.status);
    }
  } catch (err) {
    console.error("[Meta] Failed to fetch pages:", err.message);
  }

  const row = {
    user_id: userId,
    provider: "meta",
    access_token: encrypt(longLived.access_token),
    refresh_token: "",
    token_expiry: expiryDate,
    property_url: pages.length >= 1 ? pages[0].id : null,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from("user_integrations").upsert(row, { onConflict: "user_id,provider" });
    if (error) throw new Error(`Failed to save Meta tokens: ${error.message}`);
  } else {
    devTokenStore.set(userId, row);
  }

  return { pages, selected: pages.length >= 1 ? pages[0].id : null };
}

async function loadTokens(userId) {
  if (!supabase) {
    return devTokenStore.get(userId) || null;
  }
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "meta")
    .maybeSingle();
  if (error) {
    console.error("[Meta] loadTokens error:", error.message);
  }
  return data || null;
}

async function getAuthenticatedClient(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return null;

  let accessToken = decrypt(stored.access_token);
  if (!accessToken) {
    console.error("[Meta] Failed to decrypt stored token — user must reconnect");
    return { expired: true };
  }

  // Check if token needs proactive refresh (within 7 days of expiry)
  if (stored.token_expiry) {
    const expiryTime = new Date(stored.token_expiry).getTime();
    const now = Date.now();

    if (now > expiryTime) {
      // Token already expired — user must reconnect
      return { expired: true };
    }

    if (expiryTime - now < TOKEN_REFRESH_WINDOW_MS) {
      // Proactively refresh the long-lived token
      try {
        const params = new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: accessToken,
        });
        const res = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
        if (res.ok) {
          const newTokens = await res.json();
          accessToken = newTokens.access_token;
          const newExpiry = newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
            : stored.token_expiry;

          if (supabase) {
            await supabase
              .from("user_integrations")
              .update({ access_token: encrypt(accessToken), token_expiry: newExpiry, updated_at: new Date().toISOString() })
              .eq("user_id", userId)
              .eq("provider", "meta");
          } else {
            const devStored = devTokenStore.get(userId);
            if (devStored) {
              devStored.access_token = encrypt(accessToken);
              devStored.token_expiry = newExpiry;
              devTokenStore.set(userId, devStored);
            }
          }
        } else {
          console.error("[Meta] Token refresh failed:", res.status);
          return null;
        }
      } catch (err) {
        console.error("[Meta] Token refresh error:", err.message);
        return null;
      }
    }
  }

  return { accessToken, pageId: stored.property_url };
}

async function getMetaStatus(userId) {
  const stored = await loadTokens(userId);
  if (!stored) return { connected: false, page: null, pages: [] };

  let pages = [];
  try {
    const client = await getAuthenticatedClient(userId);
    if (client && client.expired) {
      return { connected: false, expired: true, page: null, pages: [] };
    }
    if (client) {
      // Debug: check what permissions the token actually has
      try {
        const permRes = await fetch(`${META_GRAPH_URL}/me/permissions`, {
          headers: { Authorization: `Bearer ${client.accessToken}` },
        });
        const permData = await permRes.json();
        console.log("[Meta] Token permissions:", JSON.stringify(permData));
      } catch (e) {
        console.error("[Meta] Failed to check permissions:", e.message);
      }

      const res = await fetch(`${META_GRAPH_URL}/me/accounts?fields=name,id,fan_count`, {
        headers: { Authorization: `Bearer ${client.accessToken}` },
      });
      const data = await res.json();
      console.log("[Meta] getMetaStatus /me/accounts:", JSON.stringify(data));
      if (res.ok) {
        pages = (data.data || []).map((p) => ({ id: p.id, name: p.name, followers: p.fan_count || 0 }));
        console.log("[Meta] getMetaStatus pages found:", pages.length);
      } else {
        console.error("[Meta] getMetaStatus failed:", data.error?.message || res.status);
      }
    }
  } catch (err) {
    console.error("[Meta] Failed to fetch pages:", err.message);
  }

  return { connected: true, page: stored.property_url, pages };
}

async function setMetaPage(userId, pageId) {
  const client = await getAuthenticatedClient(userId);
  if (client && !client.expired) {
    const res = await fetch(`${META_GRAPH_URL}/me/accounts?fields=id`, {
      headers: { Authorization: `Bearer ${client.accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      const owned = (data.data || []).map((p) => p.id);
      if (!owned.includes(pageId)) {
        throw new Error("You do not have access to this Facebook Page");
      }
    }
  }

  if (supabase) {
    await supabase
      .from("user_integrations")
      .update({ property_url: pageId, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "meta");
  } else {
    const stored = devTokenStore.get(userId);
    if (stored) {
      stored.property_url = pageId;
      devTokenStore.set(userId, stored);
    }
  }
}

async function disconnectMeta(userId) {
  if (!supabase) {
    devTokenStore.delete(userId);
    return;
  }
  await supabase.from("user_integrations").delete().eq("user_id", userId).eq("provider", "meta");
}

/**
 * Fetch Pixel data for a Page via its Ad Account.
 * Returns { id, active, events } or null if no Pixel found.
 */
async function fetchPixelData(accessToken, pageId) {
  // Step 1: Get the Page's Ad Account
  const pageRes = await fetch(`${META_GRAPH_URL}/${pageId}?fields=adaccount`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!pageRes.ok) return null;
  const pageData = await pageRes.json();
  const adAccountId = pageData.adaccount?.id;
  if (!adAccountId) return null;

  // Step 2: Get Pixels from the Ad Account
  const pixelRes = await fetch(
    `${META_GRAPH_URL}/${adAccountId}/adspixels?fields=name,id,is_unavailable,last_fired_time`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!pixelRes.ok) return null;
  const pixelData = await pixelRes.json();
  const pixels = pixelData.data || [];
  if (pixels.length === 0) return null;

  const pixel = pixels[0]; // Use the first (primary) Pixel
  const lastFired = pixel.last_fired_time ? new Date(pixel.last_fired_time) : null;
  const active = lastFired && (Date.now() - lastFired.getTime()) < 7 * 24 * 60 * 60 * 1000;

  // Step 3: Get Pixel event stats
  let events = [];
  try {
    const statsRes = await fetch(
      `${META_GRAPH_URL}/${pixel.id}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      events = (statsData.data || []).map((e) => ({
        event: e.event,
        count: e.count || 0,
        source: e.source || "browser",
      }));
    }
  } catch { /* ignore — stats are optional */ }

  return {
    id: pixel.id,
    active: !!active,
    lastFired: lastFired ? lastFired.toISOString() : null,
    events,
  };
}

function generatePixelChecks(pixel) {
  const checks = [];

  // 1. Pixel Installation
  if (pixel.active) {
    checks.push({ label: "Pixel Installation", score: 85, detail: `Meta Pixel (${pixel.id}) is active and has fired within the last 7 days.` });
  } else if (pixel.id) {
    checks.push({ label: "Pixel Installation", score: 55, detail: `Meta Pixel (${pixel.id}) is installed but has not fired recently. Check that it is correctly deployed on your site.` });
  } else {
    checks.push({ label: "Pixel Installation", score: 30, detail: "No Meta Pixel found. Install the Meta Pixel to track conversions and build audiences." });
  }

  // 2. Event Coverage
  const eventNames = pixel.events.map((e) => e.event);
  const hasPageView = eventNames.includes("PageView");
  const conversionEvents = eventNames.filter((e) => ["Purchase", "Lead", "AddToCart", "CompleteRegistration", "InitiateCheckout", "Subscribe"].includes(e));

  if (hasPageView && conversionEvents.length >= 2) {
    checks.push({ label: "Event Coverage", score: 85, detail: `PageView and ${conversionEvents.length} conversion events configured (${conversionEvents.join(", ")}). Good event coverage.` });
  } else if (hasPageView) {
    checks.push({ label: "Event Coverage", score: 55, detail: `Only PageView is firing. Add conversion events (Purchase, Lead, AddToCart) to track your funnel.` });
  } else {
    checks.push({ label: "Event Coverage", score: 30, detail: "No standard events detected. Configure at least PageView and key conversion events in your Pixel." });
  }

  // 3. Conversions API
  const serverEvents = pixel.events.filter((e) => e.source === "server");
  if (serverEvents.length > 0) {
    checks.push({ label: "Conversions API", score: 85, detail: `${serverEvents.length} event(s) sent via Conversions API (server-side). This improves data accuracy and attribution.` });
  } else if (pixel.events.length > 0) {
    checks.push({ label: "Conversions API", score: 60, detail: "All events are browser-only. Set up the Conversions API for server-side event tracking to improve data quality." });
  }
  // Skip this check entirely if no events at all

  return checks;
}

/**
 * Fetch Page Insights metrics for the last 28 days.
 */
async function fetchPageInsights(accessToken, pageId) {
  const since = Math.floor((Date.now() - 28 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);

  // Fetch Page Insights metrics
  const metrics = "page_post_engagements,page_impressions_unique,page_consumptions_by_consumption_type";
  const insightsRes = await fetch(
    `${META_GRAPH_URL}/${pageId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!insightsRes.ok) return null;
  const insightsData = await insightsRes.json();
  const metricsMap = {};
  for (const metric of insightsData.data || []) {
    metricsMap[metric.name] = metric.values || [];
  }

  // Sum daily values
  const engagements = (metricsMap.page_post_engagements || []).reduce((sum, v) => sum + (v.value || 0), 0);
  const impressionsUnique = (metricsMap.page_impressions_unique || []).reduce((sum, v) => sum + (v.value || 0), 0);

  // Extract link clicks per day for trend analysis
  const linkClickDays = (metricsMap.page_consumptions_by_consumption_type || []).map((v) => (v.value?.link_clicks || 0));

  // Fetch recent posts count
  const postsRes = await fetch(
    `${META_GRAPH_URL}/${pageId}/posts?fields=id&since=${since}&until=${until}&limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  let postCount = 0;
  if (postsRes.ok) {
    const postsData = await postsRes.json();
    postCount = (postsData.data || []).length;
  }

  return {
    postCount,
    engagements,
    impressionsUnique,
    linkClickDays,
  };
}

function generatePageInsightsChecks(insights) {
  const checks = [];
  const weeks = 4; // 28 days

  // 1. Posting Frequency
  const postsPerWeek = insights.postCount / weeks;
  if (postsPerWeek >= 3) {
    checks.push({ label: "Posting Frequency", score: 85, detail: `Posting ${Math.round(postsPerWeek * 10) / 10} times/week over the last 28 days. Consistent publishing helps maintain audience engagement.` });
  } else if (postsPerWeek >= 1) {
    checks.push({ label: "Posting Frequency", score: 55, detail: `Posting ${Math.round(postsPerWeek * 10) / 10} times/week. Aim for at least 3 posts/week to keep your audience engaged.` });
  } else {
    checks.push({ label: "Posting Frequency", score: 30, detail: `Only ${insights.postCount} post(s) in the last 28 days. Increase posting frequency to maintain visibility in the news feed.` });
  }

  // 2. Engagement Rate (engagements / unique impressions * 100)
  const engagementRate = insights.impressionsUnique > 0
    ? (insights.engagements / insights.impressionsUnique) * 100
    : 0;
  const erRound = Math.round(engagementRate * 100) / 100;

  if (engagementRate >= 3) {
    checks.push({ label: "Engagement Rate", score: 85, detail: `${erRound}% engagement rate — excellent. Your content is resonating with your audience.` });
  } else if (engagementRate >= 1) {
    checks.push({ label: "Engagement Rate", score: 55, detail: `${erRound}% engagement rate is moderate. Experiment with content types (video, polls, questions) to boost interaction.` });
  } else {
    checks.push({ label: "Engagement Rate", score: 30, detail: `${erRound}% engagement rate is low. Review your content strategy — are you posting what your audience wants to see?` });
  }

  // 3. Link Click Activity (last 7 days vs prior 21-day weekly avg)
  const days = insights.linkClickDays;
  if (days.length >= 28) {
    const last7 = days.slice(-7).reduce((a, b) => a + b, 0);
    const prior21 = days.slice(0, -7).reduce((a, b) => a + b, 0);
    const priorWeeklyAvg = prior21 / 3; // 21 days = 3 weeks

    if (priorWeeklyAvg === 0 && last7 === 0) {
      checks.push({ label: "Link Click Activity", score: 30, detail: "Near-zero link clicks in the last 28 days. Add compelling calls-to-action and link-based content to drive traffic." });
    } else if (priorWeeklyAvg === 0) {
      checks.push({ label: "Link Click Activity", score: 85, detail: `${last7} link clicks in the last 7 days, up from zero prior. Good momentum — keep sharing link-based content.` });
    } else {
      const ratio = last7 / priorWeeklyAvg;
      if (ratio >= 1) {
        checks.push({ label: "Link Click Activity", score: 85, detail: `${last7} link clicks in the last 7 days — stable or growing compared to the prior 3-week average. Your link content is driving traffic.` });
      } else if (ratio >= 0.5) {
        checks.push({ label: "Link Click Activity", score: 55, detail: `Link clicks declined to ${last7} (last 7 days) from a weekly average of ${Math.round(priorWeeklyAvg)}. Review which link posts performed best and replicate that format.` });
      } else {
        checks.push({ label: "Link Click Activity", score: 30, detail: `Sharp decline in link clicks — only ${last7} in the last 7 days vs ${Math.round(priorWeeklyAvg)}/week prior. Reassess your link content strategy.` });
      }
    }
  } else if (days.length > 0) {
    const total = days.reduce((a, b) => a + b, 0);
    checks.push({ label: "Link Click Activity", score: total > 0 ? 55 : 30, detail: `${total} link clicks recorded (incomplete 28-day data). Continue monitoring as more data accumulates.` });
  } else {
    checks.push({ label: "Link Click Activity", score: 30, detail: "No link click data available. Ensure you are sharing link-based content to drive website traffic." });
  }

  return checks;
}

/**
 * Main Meta analysis function — called during scan.
 * Returns structured data and checks, or null if not connected.
 */
async function analyzeMeta(scannedUrl, userId) {
  if (!userId) return null;
  if (!process.env.META_APP_ID) return null;

  try {
    const client = await getAuthenticatedClient(userId);
    if (!client) return null;
    if (client.expired) {
      return { available: false, reason: "reconnect_required" };
    }

    const { accessToken, pageId } = client;
    debug("Meta", "analyzeMeta: pageId =", pageId);
    if (!pageId) {
      return { available: false, reason: "no_page_selected" };
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Meta API timeout")), META_TIMEOUT_MS)
    );

    // Fetch Page info for response
    let pageInfo = { id: pageId, name: "", followers: 0 };
    try {
      const infoRes = await fetch(`${META_GRAPH_URL}/${pageId}?fields=name,fan_count`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (infoRes.ok) {
        const info = await infoRes.json();
        pageInfo = { id: pageId, name: info.name || "", followers: info.fan_count || 0 };
      }
    } catch { /* ignore */ }

    const [pixel, insights] = await Promise.race([
      Promise.all([
        fetchPixelData(accessToken, pageId),
        fetchPageInsights(accessToken, pageId),
      ]),
      timeoutPromise,
    ]);

    const checks = [];
    if (pixel) {
      checks.push(...generatePixelChecks(pixel));
    }
    if (insights) {
      checks.push(...generatePageInsightsChecks(insights));
    }

    if (checks.length === 0) {
      return { available: false, reason: "no_data" };
    }

    return {
      available: true,
      page: pageInfo,
      pixel: pixel || null,
      checks,
    };
  } catch (err) {
    console.error("[Meta] Analysis failed:", err.message);
    if (err.message?.includes("429") || err.message?.includes("rate limit")) {
      return { available: false, reason: "rate_limited" };
    }
    return null;
  }
}

module.exports = {
  getMetaAuthUrl,
  handleMetaCallback,
  getMetaStatus,
  setMetaPage,
  disconnectMeta,
  verifyState,
  analyzeMeta,
};
