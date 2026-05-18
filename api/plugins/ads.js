// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Google Ads Integration Plugin (via GA4 Data API)
 *
 * Pulls Google Ads data through a linked GA4 property using the
 * GA4 Data API dimensions: sessionGoogleAdsCampaignName,
 * sessionGoogleAdsKeyword, advertiserAdCost, etc.
 *
 * No separate OAuth or developer token needed — piggybacks on
 * the existing GA4 connection. GA4 must have Google Ads linked.
 */

const { google } = require("googleapis");

const ADS_TIMEOUT_MS = 12000;

/**
 * Fetch campaign performance from GA4's Google Ads dimensions.
 */
async function fetchCampaignData(analyticsData, propertyId) {
  const { data } = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [
        { name: "sessionGoogleAdsCampaignName" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "conversions" },
        { name: "advertiserAdClicks" },
        { name: "advertiserAdCost" },
        { name: "advertiserAdImpressions" },
        { name: "advertiserAdCostPerClick" },
        { name: "bounceRate" },
      ],
      orderBys: [{ metric: { metricName: "advertiserAdImpressions" }, desc: true }],
      limit: 15,
    },
  });

  return (data.rows || [])
    .filter(row => row.dimensionValues[0].value !== "(not set)")
    .map(row => ({
      name: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value, 10) || 0,
      users: parseInt(row.metricValues[1].value, 10) || 0,
      conversions: parseFloat(row.metricValues[2].value) || 0,
      clicks: parseInt(row.metricValues[3].value, 10) || 0,
      cost: parseFloat(row.metricValues[4].value) || 0,
      impressions: parseInt(row.metricValues[5].value, 10) || 0,
      cpc: parseFloat(row.metricValues[6].value) || 0,
      bounceRate: Math.round(parseFloat(row.metricValues[7].value) * 10000) / 100,
      ctr: parseInt(row.metricValues[5].value, 10) > 0
        ? Math.round((parseInt(row.metricValues[3].value, 10) / parseInt(row.metricValues[5].value, 10)) * 10000) / 100
        : 0,
    }));
}

/**
 * Fetch keyword performance from GA4's Google Ads dimensions.
 */
async function fetchKeywordData(analyticsData, propertyId) {
  const { data } = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [
        { name: "sessionGoogleAdsKeyword" },
        { name: "sessionGoogleAdsAdGroupName" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "conversions" },
        { name: "advertiserAdClicks" },
        { name: "advertiserAdCost" },
        { name: "advertiserAdImpressions" },
        { name: "bounceRate" },
      ],
      orderBys: [{ metric: { metricName: "advertiserAdImpressions" }, desc: true }],
      limit: 20,
    },
  });

  return (data.rows || [])
    .filter(row => row.dimensionValues[0].value !== "(not set)")
    .map(row => ({
      keyword: row.dimensionValues[0].value,
      adGroup: row.dimensionValues[1].value,
      sessions: parseInt(row.metricValues[0].value, 10) || 0,
      conversions: parseFloat(row.metricValues[1].value) || 0,
      clicks: parseInt(row.metricValues[2].value, 10) || 0,
      cost: parseFloat(row.metricValues[3].value) || 0,
      impressions: parseInt(row.metricValues[4].value, 10) || 0,
      bounceRate: Math.round(parseFloat(row.metricValues[5].value) * 10000) / 100,
      ctr: parseInt(row.metricValues[4].value, 10) > 0
        ? Math.round((parseInt(row.metricValues[2].value, 10) / parseInt(row.metricValues[4].value, 10)) * 10000) / 100
        : 0,
    }));
}

/**
 * Fetch landing page performance for paid traffic.
 */
async function fetchLandingPageData(analyticsData, propertyId) {
  const { data } = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [
        { name: "landingPage" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "conversions" },
        { name: "bounceRate" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "sessionDefaultChannelGroup",
          stringFilter: { matchType: "EXACT", value: "Paid Search" },
        },
      },
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    },
  });

  return (data.rows || [])
    .filter(row => row.dimensionValues[0].value !== "(not set)")
    .map(row => ({
      page: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value, 10) || 0,
      conversions: parseFloat(row.metricValues[1].value) || 0,
      bounceRate: Math.round(parseFloat(row.metricValues[2].value) * 10000) / 100,
    }));
}

/**
 * Generate marketing checks from Google Ads data.
 * Returns array of { label, score, detail } matching the project check shape.
 */
function generateChecks(campaigns, keywords, landingPages) {
  const checks = [];

  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  // 1. Ad CTR Performance
  if (totalImpressions > 0) {
    const overallCtr = Math.round((totalClicks / totalImpressions) * 10000) / 100;
    if (overallCtr > 3) {
      checks.push({ label: "Ad CTR Performance", score: 85, detail: `Overall ad CTR of ${overallCtr}% exceeds the 3% benchmark — your ads are compelling and well-targeted.` });
    } else if (overallCtr >= 1) {
      checks.push({ label: "Ad CTR Performance", score: 55, detail: `Ad CTR of ${overallCtr}% is moderate. Test new ad copy, add extensions, and refine keyword targeting.` });
    } else {
      checks.push({ label: "Ad CTR Performance", score: 30, detail: `Low ad CTR of ${overallCtr}%. Ads are not resonating — review keyword relevance, ad copy, and targeting settings.` });
    }
  }

  // 2. Cost Efficiency
  if (totalCost > 0 && totalConversions > 0) {
    const cpa = Math.round((totalCost / totalConversions) * 100) / 100;
    const convRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0;
    if (convRate > 5) {
      checks.push({ label: "Cost Efficiency", score: 85, detail: `Conversion rate of ${convRate}% with $${cpa.toFixed(2)} CPA — efficient spend with strong returns.` });
    } else if (convRate >= 2) {
      checks.push({ label: "Cost Efficiency", score: 55, detail: `Conversion rate of ${convRate}% ($${cpa.toFixed(2)} CPA). Optimize landing pages and bidding strategy to improve efficiency.` });
    } else {
      checks.push({ label: "Cost Efficiency", score: 30, detail: `Low conversion rate of ${convRate}% with $${cpa.toFixed(2)} CPA. Review conversion tracking, landing pages, and audience targeting.` });
    }
  } else if (totalCost > 0) {
    checks.push({ label: "Cost Efficiency", score: 30, detail: `Spending $${totalCost.toFixed(2)} with no tracked conversions. Set up conversion tracking to measure ROI.` });
  }

  // 3. Paid Traffic Bounce Rate
  const paidBounceRates = campaigns.filter(c => c.sessions > 10);
  if (paidBounceRates.length > 0) {
    const avgBounce = Math.round(paidBounceRates.reduce((s, c) => s + c.bounceRate, 0) / paidBounceRates.length);
    if (avgBounce < 40) {
      checks.push({ label: "Paid Traffic Engagement", score: 85, detail: `Paid traffic bounce rate of ${avgBounce}% is excellent. Your ads are driving engaged visitors.` });
    } else if (avgBounce <= 60) {
      checks.push({ label: "Paid Traffic Engagement", score: 55, detail: `Paid traffic bounce rate of ${avgBounce}% is average. Improve ad-to-page relevance and landing page experience.` });
    } else {
      checks.push({ label: "Paid Traffic Engagement", score: 30, detail: `High paid traffic bounce rate of ${avgBounce}%. Visitors from ads are leaving quickly — review targeting and landing page quality.` });
    }
  }

  // 4. Keyword Diversity
  const effectiveKeywords = keywords.filter(k => k.clicks > 0);
  if (effectiveKeywords.length > 0) {
    const topKeywordClicks = effectiveKeywords[0]?.clicks || 0;
    const topKeywordPct = totalClicks > 0 ? Math.round((topKeywordClicks / totalClicks) * 100) : 0;
    if (effectiveKeywords.length >= 10 && topKeywordPct < 30) {
      checks.push({ label: "Keyword Diversity", score: 85, detail: `${effectiveKeywords.length} active keywords with well-distributed traffic. No single keyword dominates.` });
    } else if (effectiveKeywords.length >= 5) {
      checks.push({ label: "Keyword Diversity", score: 55, detail: `${effectiveKeywords.length} active keywords, but top keyword drives ${topKeywordPct}% of clicks. Consider expanding your keyword set.` });
    } else {
      checks.push({ label: "Keyword Diversity", score: 30, detail: `Only ${effectiveKeywords.length} active keywords. Broaden your keyword strategy to capture more search intent.` });
    }
  }

  // 5. Landing Page Concentration
  if (landingPages.length > 0) {
    const topPageSessions = landingPages[0]?.sessions || 0;
    const totalPaidSessions = landingPages.reduce((s, lp) => s + lp.sessions, 0);
    const topPct = totalPaidSessions > 0 ? Math.round((topPageSessions / totalPaidSessions) * 100) : 0;
    if (landingPages.length >= 5 && topPct < 40) {
      checks.push({ label: "Landing Page Strategy", score: 85, detail: `${landingPages.length} landing pages with balanced traffic distribution — good variety for different ad groups.` });
    } else if (landingPages.length >= 3) {
      checks.push({ label: "Landing Page Strategy", score: 55, detail: `${landingPages.length} landing pages, but top page receives ${topPct}% of paid sessions. Create more targeted landing pages for different ad groups.` });
    } else {
      checks.push({ label: "Landing Page Strategy", score: 30, detail: `Only ${landingPages.length} landing page(s) for paid traffic. Create dedicated landing pages matched to specific ad groups and keywords.` });
    }
  }

  return checks;
}

/**
 * Main Google Ads analysis function — called during scan.
 * Uses the GA4 authenticated client to query Google Ads data
 * through GA4's linked Ads dimensions.
 *
 * @param {object} ga4Auth - { oauth2, propertyId } from GA4 getAuthenticatedClient
 * @returns {object|null} Ads data and checks, or null if no Ads data in GA4
 */
async function analyzeAds(ga4Auth) {
  if (!ga4Auth) return null;

  const { oauth2, propertyId } = ga4Auth;
  if (!propertyId) return null;

  try {
    const analyticsData = google.analyticsdata({ version: "v1beta", auth: oauth2 });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Google Ads via GA4 timeout")), ADS_TIMEOUT_MS)
    );

    const [campaigns, keywords, landingPages] = await Promise.race([
      Promise.all([
        fetchCampaignData(analyticsData, propertyId),
        fetchKeywordData(analyticsData, propertyId),
        fetchLandingPageData(analyticsData, propertyId),
      ]),
      timeoutPromise,
    ]);

    // No Google Ads data linked to this GA4 property
    if (campaigns.length === 0 && keywords.length === 0) {
      return null;
    }

    const checks = generateChecks(campaigns, keywords, landingPages);

    // Compute totals for overview
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

    return {
      available: true,
      source: "ga4",
      overview: {
        impressions: totalImpressions,
        clicks: totalClicks,
        cost: Math.round(totalCost * 100) / 100,
        conversions: Math.round(totalConversions * 10) / 10,
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        avgCpc: totalClicks > 0 ? Math.round((totalCost / totalClicks) * 100) / 100 : 0,
      },
      campaigns,
      topKeywords: keywords,
      landingPages,
      checks,
    };
  } catch (err) {
    console.error("[Ads] Analysis via GA4 failed:", err.message);
    return null;
  }
}

module.exports = { analyzeAds };
