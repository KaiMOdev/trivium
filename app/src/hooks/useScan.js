// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

function buildStages(hasCompetitors, connectedIntegrations = {}) {
  return [
    "Resolving DNS...",
    "Checking robots.txt & sitemap...",
    "Crawling homepage...",
    "Extracting meta tags & structured data...",
    "Analyzing page speed...",
    "Detecting CMS platform...",
    "Running SEO checks...",
    "Querying WordPress API...",
    "Evaluating AI search readiness...",
    "Generating marketing insights...",
    ...(connectedIntegrations.gsc ? ["Fetching Search Console data..."] : []),
    ...(connectedIntegrations.ga4 ? ["Fetching analytics data..."] : []),
    ...(connectedIntegrations.ads ? ["Fetching Google Ads data..."] : []),
    ...(connectedIntegrations.meta ? ["Fetching Meta Business data..."] : []),
    ...(hasCompetitors ? ["Scanning competitors...", "Building comparison..."] : []),
    "Compiling report...",
  ];
}

export default function useScan() {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("");
  const [stages, setStages] = useState([]);
  const [results, setResults] = useState(null);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [scanError, setScanError] = useState(null);

  const [siteResults, setSiteResults] = useState(null);
  const [scanMode, setScanMode] = useState("single");
  const abortRef = useRef(null);

  const startScan = useCallback((url, _tier, competitors = [], connectedIntegrations = {}) => {
    if (!url.trim()) return;

    const validCompetitors = competitors.filter((c) => c.trim());
    const hasCompetitors = validCompetitors.length > 0;

    const scanStages = buildStages(hasCompetitors, connectedIntegrations);
    setStages(scanStages);
    setScanning(true);
    setScanProgress(0);
    setResults(null);
    setComparisonResults(null);
    setScanError(null);
    setSiteResults(null);
    setScanMode("single");

    let step = 0;
    const stepDuration = Math.round(10000 / scanStages.length);
    const interval = setInterval(() => {
      step++;
      const maxProgress = (scanStages.length - 1) / scanStages.length * 100;
      setScanProgress(Math.min((step / scanStages.length) * 100, maxProgress));
      setScanStage(scanStages[Math.min(step - 1, scanStages.length - 2)]);
      if (step >= scanStages.length - 1) clearInterval(interval);
    }, stepDuration);

    const endpoint = hasCompetitors ? `${API_URL}/api/scan/compare` : `${API_URL}/api/scan`;
    const body = hasCompetitors ? { url, competitors: validCompetitors } : { url };

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error(text || `Server returned ${res.status}`); }
        if (!res.ok) throw new Error(data.error || "Scan failed");
        return data;
      })
      .then((data) => {
        clearInterval(interval);
        setScanProgress(100);
        setScanStage(scanStages[scanStages.length - 1]);

        setTimeout(() => {
          setScanning(false);
          if (hasCompetitors) {
            const p = data.primary;
            setResults({
              seo: p.seo, llm: p.llm, marketing: p.marketing, performance: p.performance,
              scores: p.scores, meta: p.meta, platform: p.platform, wordpress: p.wordpress,
              shopify: p.shopify, gsc: p.gsc, ga4: p.ga4, ads: p.ads,
              adobeAnalytics: p.adobeAnalytics, metaBusiness: p.metaBusiness,
              readability: p.readability, finalUrl: p.finalUrl, url: p.url, scannedAt: p.scannedAt,
            });
            setComparisonResults({ primary: p, competitors: data.competitors, comparedAt: data.comparedAt });
          } else {
            setResults({
              seo: data.seo, llm: data.llm, marketing: data.marketing, performance: data.performance,
              scores: data.scores, meta: data.meta, platform: data.platform, wordpress: data.wordpress,
              shopify: data.shopify, gsc: data.gsc, ga4: data.ga4, ads: data.ads,
              adobeAnalytics: data.adobeAnalytics, metaBusiness: data.metaBusiness,
              readability: data.readability, finalUrl: data.finalUrl, url: data.url, scannedAt: data.scannedAt,
            });
          }
        }, 200);
      })
      .catch((err) => {
        clearInterval(interval);
        setScanning(false);
        setScanError(err.message);
      });
  }, []);

  const startSiteScan = useCallback((url, _tier, connectedIntegrations = {}, { pageLimit: requestedPageLimit } = {}) => {
    if (!url.trim()) return;

    const pageLimit = requestedPageLimit || 200;
    if (pageLimit <= 1) {
      return startScan(url, null, [], connectedIntegrations);
    }

    setScanning(true);
    setScanProgress(0);
    setScanStage("Discovering pages...");
    setStages(["Discovering pages...", "Scanning pages...", "Aggregating results..."]);
    setResults(null);
    setComparisonResults(null);
    setScanError(null);
    setSiteResults(null);
    setScanMode("site");

    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`${API_URL}/api/scan/site`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, pageLimit }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { /* ignore */ }
          throw new Error(data?.error || `Server returned ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const pageResults = [];
        let aggregate = null;
        let primaryResult = null;
        let primaryUrl = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            let event;
            try { event = JSON.parse(line); } catch { continue; }

            if (event.type === "status") {
              setScanStage(event.message);
            } else if (event.type === "discovery") {
              setScanStage(`Found ${event.total} pages to scan...`);
            } else if (event.type === "page") {
              pageResults.push(event.result || { url: event.url, error: event.error });
              const pct = Math.round((event.completed / event.total) * 90) + 5;
              setScanProgress(pct);
              setScanStage(`Scanning page ${event.completed} of ${event.total}...`);
            } else if (event.type === "complete") {
              aggregate = event.aggregate;
              primaryResult = event.primary;
              primaryUrl = event.primaryUrl || primaryResult?.url;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }

        setScanProgress(100);
        setScanStage("Site scan complete");

        setTimeout(() => {
          setScanning(false);
          if (primaryResult && !primaryResult.error) {
            setResults({
              seo: primaryResult.seo, llm: primaryResult.llm, marketing: primaryResult.marketing,
              performance: primaryResult.performance, scores: primaryResult.scores,
              meta: primaryResult.meta, platform: primaryResult.platform,
              wordpress: primaryResult.wordpress, shopify: primaryResult.shopify,
              gsc: primaryResult.gsc, ga4: primaryResult.ga4, ads: primaryResult.ads,
              adobeAnalytics: primaryResult.adobeAnalytics, metaBusiness: primaryResult.metaBusiness,
              readability: primaryResult.readability, finalUrl: primaryResult.finalUrl,
              url: primaryResult.url, scannedAt: primaryResult.scannedAt,
            });
          } else {
            setResults({
              seo: [], llm: [], marketing: [], performance: {},
              scores: aggregate?.scores || { seo: 0, llm: 0, marketing: 0, performance: 0 },
              meta: {}, platform: {}, wordpress: null,
              url: primaryUrl || url, scannedAt: new Date().toISOString(),
            });
          }

          setSiteResults({ pages: pageResults, aggregate, primaryUrl });
        }, 200);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setScanning(false);
        setScanError(err.message);
      });
  }, [startScan]);

  const cancelScan = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setScanning(false);
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setComparisonResults(null);
    setSiteResults(null);
    setScanError(null);
    setScanMode("single");
  }, []);

  return {
    scanning, scanProgress, scanStage, stages, results, comparisonResults, scanError,
    siteResults, scanMode,
    startScan, startSiteScan, cancelScan, reset,
  };
}
