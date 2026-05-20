// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { FONTS_CSS, theme } from "./config/theme";
import { useAuth } from "./contexts/AuthContext";
import { TIERS, TIER_FEATURES, tierOrder, tierAtLeast } from "./config/tiers";
import ScoreRing from "./components/ScoreRing";
import TierBadge from "./components/TierBadge";
import UpgradeBanner from "./components/UpgradeBanner";
import SectionHeader from "./components/SectionHeader";
import CheckRow from "./components/CheckRow";
import ScoreCard from "./components/ScoreCard";
import SeverityGroupedList from "./components/SeverityGroupedList";
import PerformanceMetricCard from "./components/PerformanceMetricCard";
import useScan from "./hooks/useScan";
import useScanHistory from "./hooks/useScanHistory";
import useAISummary from "./hooks/useAISummary";
import useIsMobile from "./hooks/useIsMobile";
import AISummaryCard from "./components/AISummaryCard";
import MetaPanel from "./components/MetaPanel";
import ClassificationCard from "./components/ClassificationCard";
// Retry dynamic imports once on failure (handles stale chunks after deploy)
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      const key = "chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise(() => {}); // never resolves — page is reloading
      }
      sessionStorage.removeItem(key);
      return importFn(); // retry once, then let it fail naturally
    })
  );
}

// Lazy-loaded components (only loaded when needed, reduces initial bundle)
const PricingModal = lazyWithRetry(() => import("./components/PricingModal"));
const InsightsPanel = lazyWithRetry(() => import("./components/InsightsPanel"));
const CompetitorPanel = lazyWithRetry(() => import("./components/CompetitorPanel"));
const TrendsPanel = lazyWithRetry(() => import("./components/TrendsPanel"));
const AccountPage = lazyWithRetry(() => import("./components/account/AccountPage"));
const SupportPage = lazyWithRetry(() => import("./components/support/SupportPage"));
const PageAuditApp = lazyWithRetry(() => import("./components/audit/PageAuditApp"));

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  ::selection { background: ${theme.accent}; color: ${theme.bg}; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${theme.cardBorder}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.textDim}; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scanPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
  }
  @keyframes scanBeam {
    0% { transform: translateX(-100%) skewX(-15deg); }
    100% { transform: translateX(200%) skewX(-15deg); }
  }
  @keyframes orbitalSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(0,245,212,0.05); }
    50% { box-shadow: 0 0 40px rgba(0,245,212,0.12); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes breathe {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .fade-up { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-in { animation: fadeIn 0.4s ease-out both; }
  .card-hover { transition: all 0.3s cubic-bezier(0.22,1,0.36,1); }
  .card-hover:hover { border-color: ${theme.cardBorderHover} !important; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }

  /* Grain overlay */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    opacity: ${theme.grainOpacity};
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px;
    mix-blend-mode: overlay;
  }

  /* Tab button base styling */
  .tab-btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: ${theme.textMuted};
    font-size: 12px;
    font-weight: 500;
    font-family: ${theme.fontBody};
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    position: relative;
  }
  .tab-btn:hover { color: ${theme.text}; background: rgba(255,255,255,0.03); }
  .tab-btn.active {
    color: ${theme.text};
    background: ${theme.card};
    border-color: ${theme.cardBorder};
    box-shadow: 0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04);
  }
`;

export default function SiteAuditApp() {
  const [url, setUrl] = useState("");
  const [dbTier, setDbTier] = useState("free");
  const adminTestTier = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("adminTestTier") : null;
  const [tier, setTier] = useState(() => {
    const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("adminTestTier") : null;
    if (stored && ["free", "pro", "premium"].includes(stored)) return stored;
    return import.meta.env.DEV ? "premium" : "free";
  });
  const [activeTab, setActiveTab] = useState("seo");
  const [connectedIntegrations, setConnectedIntegrations] = useState({});
  const [gscStatus, setGscStatus] = useState({ connected: false, property: null, properties: [] });
  const [ga4Status, setGa4Status] = useState({ connected: false, property: null, properties: [] });
  const [adobeAnalyticsStatus, setAdobeAnalyticsStatus] = useState({ connected: false, property: null, properties: [] });
  const [metaStatus, setMetaStatus] = useState({ connected: false, page: null, pages: [] });
  const [view, setView] = useState("scan");
  const [accountInitialSection, setAccountInitialSection] = useState(null);
  const [supportInitialSection, setSupportInitialSection] = useState(null);
  const [supportInitialTicket, setSupportInitialTicket] = useState(null);
  const [oauthError, setOauthError] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [competitors, setCompetitors] = useState([""]);
  const [showCompetitorInputs, setShowCompetitorInputs] = useState(false);
  const [customPageLimit, setCustomPageLimit] = useState(null); // null = use tier max
  const [expandedIssues, setExpandedIssues] = useState({});
  const inputRef = useRef(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  const { user, session, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();
  const { scanning, scanProgress, scanStage, stages, results, comparisonResults, scanError, startScan, siteResults, scanMode, startSiteScan, cancelScan, reset } = useScan();
  const scanHistory = useScanHistory();
  const summaryState = useAISummary(session);

  const features = TIER_FEATURES[tier];
  const tc = TIERS[tier];
  const maxCompetitors = features.competitors || 0;
  const API_URL = import.meta.env.VITE_API_URL || "";

  // Check GSC connection status on mount and after OAuth callback
  const fetchGscStatus = async () => {
    try {
      const { supabase } = await import("./config/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/integrations/gsc/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setGscStatus(await res.json());
    } catch { /* ignore */ }
  };

  // Affiliate referral cookie logic
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        // First-click wins: don't overwrite existing cookie
        const existingCookie = document.cookie.split("; ").find(c => c.startsWith("sap_ref="));
        if (!existingCookie) {
          const cookieData = JSON.stringify({ code: refCode, ts: Date.now() });
          const maxAge = 60 * 60 * 24 * 60; // 60 days
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `sap_ref=${encodeURIComponent(cookieData)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
        }
        // Remove ref param from URL without reload
        params.delete("ref");
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    } catch (e) {
      console.error("[Affiliate] Cookie error:", e);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gsc") === "connected" || params.get("gsc") === "error") {
      if (params.get("gsc") === "error") setOauthError("gsc");
      window.history.replaceState({}, "", window.location.pathname);
      setView("account");
      setAccountInitialSection("integrations");
    }
    if (params.get("ga4") === "connected" || params.get("ga4") === "error") {
      if (params.get("ga4") === "error") setOauthError("ga4");
      window.history.replaceState({}, "", window.location.pathname);
      setView("account");
      setAccountInitialSection("integrations");
    }
    if (params.get("adobe_analytics") === "connected" || params.get("adobe_analytics") === "error") {
      if (params.get("adobe_analytics") === "error") setOauthError("adobe_analytics");
      window.history.replaceState({}, "", window.location.pathname);
      setView("account");
      setAccountInitialSection("integrations");
    }
    if (params.get("meta_business") === "connected" || params.get("meta_business") === "error") {
      if (params.get("meta_business") === "error") setOauthError("meta");
      window.history.replaceState({}, "", window.location.pathname);
      setView("account");
      setAccountInitialSection("integrations");
    }
    if (params.get("view") === "support") {
      const ticketParam = params.get("ticket");
      setSupportInitialSection(ticketParam ? "my-tickets" : "knowledge-base");
      if (ticketParam) setSupportInitialTicket(ticketParam);
      setView("support");
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetchGscStatus();
    fetchGa4Status();
    fetchAdobeAnalyticsStatus();
    fetchMetaStatus();
  }, [API_URL]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    (async () => {
      try {
        const { supabase } = await import("./config/supabase");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsAdmin(data.isAdmin || false);
        setProfileData({
          company_name: data.company_name || "",
          website_url: data.website_url || "",
          job_title: data.job_title || "",
          industry: data.industry || "",
        });
        if (data.website_url && !url) {
          setUrl(data.website_url);
        }
        if (data.tier && ["free", "pro", "premium"].includes(data.tier)) {
          setDbTier(data.tier);
          // Only use DB tier if no admin sessionStorage override is active
          const override = sessionStorage.getItem("adminTestTier");
          if (!override || !["free", "pro", "premium"].includes(override)) {
            setTier(data.tier);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [user]);

  // Poll /api/health to detect new deployments
  useEffect(() => {
    let knownBuildId = null;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) return;
        const data = await res.json();
        if (knownBuildId === null) {
          knownBuildId = data.buildId;
        } else if (data.buildId && data.buildId !== knownBuildId) {
          setNewVersionAvailable(true);
        }
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Check GA4 connection status on mount and after OAuth callback
  const fetchGa4Status = async () => {
    try {
      const { supabase } = await import("./config/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/integrations/ga4/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setGa4Status(await res.json());
    } catch { /* ignore */ }
  };

  // Check Adobe Analytics connection status on mount and after OAuth callback
  const fetchAdobeAnalyticsStatus = async () => {
    try {
      const { supabase } = await import("./config/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/integrations/adobe-analytics/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setAdobeAnalyticsStatus(await res.json());
    } catch { /* ignore */ }
  };

  const fetchMetaStatus = async () => {
    try {
      const { supabase } = await import("./config/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/integrations/meta/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setMetaStatus(await res.json());
    } catch { /* ignore */ }
  };

  const handleGscConnect = async () => {
    const { supabase } = await import("./config/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    window.location.href = `${API_URL}/api/integrations/gsc/auth?token=${encodeURIComponent(session.access_token)}`;
  };

  const handleGa4Connect = async () => {
    const { supabase } = await import("./config/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    window.location.href = `${API_URL}/api/integrations/ga4/auth?token=${encodeURIComponent(session.access_token)}`;
  };

  const activeConnections = {
    gsc: gscStatus.connected,
    ga4: ga4Status.connected,
    ads: ga4Status.connected, // Ads piggybacks on GA4 connection
    adobe_analytics: adobeAnalyticsStatus.connected,
    meta: metaStatus.connected,
  };

  const handleScan = () => {
    setView("scan");
    summaryState.reset();
    startScan(url, tier, competitors, activeConnections, { isAdmin });
  };

  const handleSiteScan = () => {
    setView("scan");
    summaryState.reset();
    const maxPages = TIER_FEATURES[tier]?.pageLimit || 1;
    const pageLimit = customPageLimit ? Math.min(customPageLimit, maxPages) : maxPages;
    startSiteScan(url, tier, activeConnections, { isAdmin, pageLimit });
  };

  const handleGenerateSummary = () => {
    if (results) {
      summaryState.fetchSummary(
        results.scores,
        { seo: results.seo, llm: results.llm, marketing: results.marketing },
        { url: results.url, title: results.meta?.title, platform: results.platform?.name || null, industry: profileData?.industry || null },
        results.classification || null
      );
    }
  };

  const showResults = results !== null;
  useEffect(() => {
    if (showResults && view === "scan" && !scanning) {
      setView("results");
      setActiveTab(siteResults ? "site-overview" : comparisonResults ? "competitors" : "seo");
      // Auto-save scan to history (Premium feature)
      if (tierAtLeast(tier, "premium") && results.scores) {
        scanHistory.recordScan(results.url || url, results.scores, results.meta);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally fires only when scan completes (showResults/scanning change)
  }, [showResults, scanning, siteResults, comparisonResults, tier, url]);

  const seoScore = results?.scores.seo ?? 0;
  const llmScore = results?.scores.llm ?? 0;
  const mktScore = results?.scores.marketing ?? 0;
  const perfScore = results?.scores.performance ?? 0;
  const hasPerfData = perfScore > 0;
  const overallScore = hasPerfData
    ? Math.round((seoScore + llmScore + mktScore + perfScore) / 4)
    : Math.round((seoScore + llmScore + mktScore) / 3);

  const visibleSeoChecks = tier === "free" ? 5 : (results?.seo.length ?? 0);
  const hiddenSeoCount = (results?.seo.length ?? 0) - visibleSeoChecks;
  const visibleLlmChecks = Math.min(features.llmChecks, results?.llm.length ?? 0);
  const hiddenLlmCount = (results?.llm.length ?? 0) - visibleLlmChecks;
  const visibleMktChecks = Math.min(features.marketingChecks, results?.marketing.length ?? 0);
  const hiddenMktCount = (results?.marketing.length ?? 0) - visibleMktChecks;

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bgGradient,
      color: theme.text,
      fontFamily: theme.fontBody,
      lineHeight: 1.5,
      position: "relative",
    }}>
      <style>{FONTS_CSS}{GLOBAL_CSS}</style>

      {showPricing && <Suspense fallback={null}><PricingModal currentTier={tier} onClose={() => setShowPricing(false)} onSelect={setTier} /></Suspense>}

      {/* Summary error toast */}
      {summaryState.error && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: theme.dangerGlow, border: `1px solid ${theme.danger}33`,
          color: theme.danger, fontSize: 13, fontFamily: theme.fontBody,
          maxWidth: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ flex: 1 }}>{summaryState.error}</span>
          <button onClick={() => summaryState.clearError()} style={{
            background: "none", border: "none", color: theme.danger,
            cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1,
          }}>×</button>
        </div>
      )}

      {/* Admin test-tier banner */}
      {isAdmin && adminTestTier && ["free", "pro", "premium"].includes(adminTestTier) && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          padding: "8px 20px",
          background: `linear-gradient(135deg, ${TIERS[adminTestTier]?.color || theme.accent}18, ${TIERS[adminTestTier]?.color || theme.accent}08)`,
          borderTop: `1px solid ${TIERS[adminTestTier]?.color || theme.accent}44`,
          backdropFilter: "blur(8px)",
          fontFamily: theme.fontMono, fontSize: 11, color: theme.textMuted,
          letterSpacing: "0.04em",
        }}>
          <span>Testing as <strong style={{ color: TIERS[adminTestTier]?.color || theme.text }}>{TIERS[adminTestTier]?.label || adminTestTier}</strong></span>
          <button onClick={() => { sessionStorage.removeItem("adminTestTier"); setTier(dbTier); }} style={{
            padding: "3px 10px", borderRadius: 5, border: `1px solid ${theme.cardBorder}`,
            background: "transparent", color: theme.textMuted, fontSize: 10,
            cursor: "pointer", fontFamily: theme.fontMono,
          }}>Reset</button>
        </div>
      )}

      {/* New version banner */}
      {newVersionAvailable && (
        <div className="sap-version-banner" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          padding: "10px 20px",
          background: `linear-gradient(135deg, ${theme.accent}22, ${theme.pro}22)`,
          borderBottom: `1px solid ${theme.accent}44`,
          backdropFilter: "blur(8px)",
          fontFamily: theme.fontBody, fontSize: 13, color: theme.text,
        }}>
          <span>A new version is available.</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "4px 14px", borderRadius: 6, border: "none",
              background: theme.accent, color: theme.bg,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: theme.fontBody,
            }}
          >Refresh</button>
          <button
            onClick={() => setNewVersionAvailable(false)}
            style={{
              background: "transparent", border: "none",
              color: theme.textMuted, cursor: "pointer", fontSize: 16,
              padding: "0 4px", lineHeight: 1,
            }}
          >×</button>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="sap-header" style={{
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${theme.cardBorder}`,
        background: "rgba(6,8,12,0.8)",
        backdropFilter: "blur(16px) saturate(1.4)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        {/* Hamburger button (mobile only) */}
        <button
          className="sap-hamburger"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            width: 36, height: 36,
            background: "transparent",
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 8,
            color: theme.text,
            fontSize: 18,
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          {showMobileMenu ? "✕" : "☰"}
        </button>

        {/* Logo — click to return to results if available, otherwise scan */}
        <div
          onClick={() => { setView(showResults ? "results" : "scan"); setShowMobileMenu(false); }}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.violet})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: theme.bg, fontFamily: theme.fontDisplay, position: "relative", zIndex: 1 }}>S</span>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)",
              backgroundSize: "200% 200%",
              animation: "shimmer 3s ease-in-out infinite",
            }} />
          </div>
          <span className="sap-header-logo-text" style={{
            fontFamily: theme.fontDisplay,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}>
            Trivium
          </span>
        </div>

        {/* Nav */}
        <nav className="sap-header-nav" style={{ display: "flex", gap: 2 }}>
          {[
            { id: "scan", label: "Scan", icon: "◎" },
            { id: "results", label: "Report", icon: "◧", disabled: !showResults },
            { id: "audit", label: "Page Audit", icon: "✎" },
          ].map(tab => (
            <button key={tab.id} onClick={() => !tab.disabled && (tab.action ? tab.action() : setView(tab.id))}
              className={`tab-btn ${view === tab.id ? "active" : ""}`}
              style={{
                opacity: tab.disabled ? 0.3 : 1,
                cursor: tab.disabled ? "not-allowed" : "pointer",
                ...(view === tab.id ? { color: theme.accent } : {}),
              }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{tab.icon}</span> {tab.label}
              {tab.id === "results" && showResults && view !== "results" && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: theme.accent, display: "inline-block",
                  animation: "breathe 2s ease-in-out infinite",
                  boxShadow: `0 0 6px ${theme.accent}`,
                  marginLeft: 2,
                }} />
              )}
            </button>
          ))}
        </nav>

        {/* Help button */}
        <button
          className="sap-header-help"
          onClick={() => { setSupportInitialSection("knowledge-base"); setView("support"); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 8,
            background: "transparent", border: `1px solid ${theme.cardBorder}`,
            color: theme.textMuted, cursor: "pointer",
            fontFamily: theme.fontBody, fontSize: 13, fontWeight: 500,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = theme.cardBorder; e.currentTarget.style.color = theme.textMuted; }}
        >
          <span style={{ fontSize: 15 }}>?</span> Help
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a className="sap-header-website" href="https://github.com/KaiMOdev/trivium" target="_blank" rel="noopener noreferrer" style={{
            padding: "5px 14px", borderRadius: 8,
            border: `1px solid ${theme.cardBorder}`,
            background: "transparent", color: theme.textMuted,
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            fontFamily: theme.fontBody,
            transition: "all 0.2s",
            textDecoration: "none",
          }}>GitHub</a>
        </div>
      </header>

      {/* ─── Mobile Menu ─── */}
      {showMobileMenu && (
        <div className="sap-mobile-menu" style={{ display: "none" }}>
          {[
            { id: "scan", label: "◎ Scan", action: () => setView("scan") },
            { id: "results", label: "◧ Report", disabled: !showResults, action: () => setView("results") },
            { id: "audit", label: "✎ Page Audit", action: () => setView("audit") },
            { id: "help", label: "? Help", action: () => { setSupportInitialSection("knowledge-base"); setView("support"); } },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { if (!item.disabled) { item.action(); setShowMobileMenu(false); } }}
              style={{
                width: "100%", padding: "12px 16px",
                background: view === item.id ? theme.accentGlow : "transparent",
                border: "none", borderRadius: 8,
                color: item.disabled ? theme.textDim : view === item.id ? theme.accent : theme.text,
                fontSize: 13, fontWeight: view === item.id ? 600 : 400,
                fontFamily: theme.fontBody,
                cursor: item.disabled ? "not-allowed" : "pointer",
                textAlign: "left", transition: "all 0.15s",
                opacity: item.disabled ? 0.4 : 1,
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{
            margin: "8px 16px", padding: "8px 0",
            borderTop: `1px solid ${theme.cardBorder}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              padding: "4px 12px", borderRadius: 6,
              background: tc.bg || "rgba(255,255,255,0.05)",
              border: `1px solid ${tc.border}`,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: theme.fontMono, color: tc.color }}>
                {tc.icon} {tc.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Report return banner ─── */}
      {showResults && view !== "results" && !scanning && (
        <div className="sap-report-banner" style={{
          background: `linear-gradient(90deg, ${theme.accentGlow}, transparent)`,
          borderBottom: `1px solid ${theme.accentDim}`,
          padding: "8px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontBody }}>
            You have scan results for <strong style={{ color: theme.text }}>{results?.url || url}</strong>
          </span>
          <button onClick={() => setView("results")} style={{
            padding: "4px 14px", borderRadius: 6,
            border: `1px solid ${theme.accentDim}`,
            background: theme.accentGlow, color: theme.accent,
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: theme.fontMono, letterSpacing: "0.04em",
            transition: "all 0.2s",
          }}>← Back to Report</button>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="sap-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px" }}>

        {/* ═══ SCAN VIEW ═══ */}
        {view === "scan" && (
          <div className="fade-up">
            {!scanning && !showResults && (
              <div style={{ textAlign: "center", padding: "64px 0 44px", position: "relative" }}>
                {/* Decorative orbital rings */}
                <div className="sap-hero-decorative" style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 340, height: 340, borderRadius: "50%",
                  border: `1px solid rgba(0,245,212,0.04)`,
                  animation: "orbitalSpin 60s linear infinite",
                  pointerEvents: "none",
                }}>
                  <div style={{
                    position: "absolute", top: -3, left: "50%",
                    width: 6, height: 6, borderRadius: "50%",
                    background: theme.accent, opacity: 0.4,
                    boxShadow: `0 0 12px ${theme.accent}`,
                  }} />
                </div>
                <div className="sap-hero-decorative" style={{
                  position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)",
                  width: 260, height: 260, borderRadius: "50%",
                  border: `1px dashed rgba(167,119,255,0.06)`,
                  animation: "orbitalSpin 45s linear infinite reverse",
                  pointerEvents: "none",
                }}>
                  <div style={{
                    position: "absolute", bottom: -2, right: "20%",
                    width: 4, height: 4, borderRadius: "50%",
                    background: theme.violet, opacity: 0.3,
                  }} />
                </div>

                <h1 className="sap-hero-title" style={{
                  fontFamily: theme.fontDisplay,
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  marginBottom: 16,
                  position: "relative",
                }}>
                  Is your site ready for<br />
                  <span style={{
                    background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.violet} 60%, ${theme.accent} 100%)`,
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "shimmer 4s ease-in-out infinite",
                  }}>AI-powered search?</span>
                </h1>
                <p className="sap-hero-subtitle" style={{
                  color: theme.textMuted,
                  fontSize: 16,
                  maxWidth: 520,
                  margin: "0 auto 20px",
                  lineHeight: 1.7,
                  fontWeight: 300,
                }}>
                  Analyze SEO health, marketing effectiveness, and AI search readiness
                  for ChatGPT, Perplexity, and Claude.
                </p>

                {/* Tier indicator pill */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px",
                  background: tc.bg || "rgba(255,255,255,0.02)",
                  borderRadius: 100,
                  border: `1px solid ${tc.border || theme.cardBorder}`,
                  marginBottom: 36,
                }}>
                  <span style={{ color: tc.color, fontSize: 11, fontWeight: 700, fontFamily: theme.fontMono, letterSpacing: "0.06em" }}>
                    {tc.icon} {tc.label}
                  </span>
                  <span style={{ width: 1, height: 14, background: theme.cardBorder }} />
                  <span style={{ color: theme.textMuted, fontSize: 11 }}>
                    {features.scansPerMonth === -1 ? "Unlimited scans" : `${features.scansPerMonth} scans/mo`}
                  </span>
                </div>
              </div>
            )}

            {/* ─── Search bar ─── */}
            <div className="sap-search-bar" style={{
              display: "flex", gap: 0, maxWidth: 640, margin: "0 auto 48px",
              background: theme.surface,
              borderRadius: 14,
              border: `1px solid ${theme.cardBorder}`,
              overflow: "hidden",
              transition: "border-color 0.3s, box-shadow 0.3s",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}
              onFocus={e => {
                e.currentTarget.style.borderColor = theme.accentDim;
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px ${theme.accentDim}`;
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = theme.cardBorder;
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)";
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", padding: "0 0 0 18px",
                color: theme.textDim, fontSize: 14,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input ref={inputRef} type="text" value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                placeholder="Enter any URL to analyze..."
                disabled={scanning}
                style={{
                  flex: 1, padding: "16px 14px", border: "none", background: "transparent",
                  color: theme.text, fontSize: 14, fontFamily: theme.fontMono,
                  fontWeight: 400, outline: "none", letterSpacing: "-0.01em",
                }} />
              <button className="sap-search-btn" onClick={handleScan} disabled={scanning || !url.trim()}
                style={{
                  padding: "16px 28px", border: "none", margin: 4, borderRadius: 10,
                  background: scanning ? theme.textDim : `linear-gradient(135deg, ${theme.accent}, ${theme.accentDim})`,
                  color: theme.bg, fontWeight: 700, fontSize: 13, fontFamily: theme.fontDisplay,
                  cursor: scanning ? "wait" : "pointer",
                  transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                  whiteSpace: "nowrap", letterSpacing: "0.02em",
                  boxShadow: scanning ? "none" : `0 2px 16px rgba(0,245,212,0.25)`,
                }}>
                {scanning ? "Scanning..." : "Analyze Homepage"}
              </button>
              <button onClick={() => setView("audit")}
                style={{
                  padding: "16px 20px", margin: "4px 4px 4px 0",
                  borderRadius: 10,
                  background: theme.surface,
                  color: theme.accent,
                  fontWeight: 600, fontSize: 12, fontFamily: theme.fontDisplay,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                  whiteSpace: "nowrap", letterSpacing: "0.02em",
                  border: `1px solid ${theme.accent}40`,
                }}>
                Page Audit
              </button>
            </div>

            {/* ─── Competitor URL Inputs ─── */}
            {!scanning && !showResults && (
              <div style={{ maxWidth: 640, margin: "-32px auto 32px", position: "relative" }}>
                {maxCompetitors > 0 ? (
                  <>
                    <button onClick={() => setShowCompetitorInputs(!showCompetitorInputs)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, margin: "0 auto",
                        padding: "8px 18px", borderRadius: 8,
                        background: showCompetitorInputs ? theme.surface : "transparent",
                        border: `1px solid ${showCompetitorInputs ? theme.cardBorderHover : theme.cardBorder}`,
                        color: showCompetitorInputs ? theme.accent : theme.textMuted,
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                        fontFamily: theme.fontBody, transition: "all 0.25s",
                      }}>
                      <span style={{ fontSize: 14, transition: "transform 0.2s", transform: showCompetitorInputs ? "rotate(45deg)" : "none" }}>+</span>
                      {showCompetitorInputs ? "Hide competitors" : `Add up to ${maxCompetitors} competitor${maxCompetitors > 1 ? "s" : ""}`}
                      <TierBadge tier={maxCompetitors > 2 ? "premium" : "pro"} />
                    </button>
                    {showCompetitorInputs && (
                      <div className="fade-up" style={{
                        marginTop: 12, padding: 18, borderRadius: 14,
                        background: theme.surface, border: `1px solid ${theme.cardBorder}`,
                      }}>
                        <div style={{
                          fontSize: 11, color: theme.textDim, marginBottom: 12,
                          fontFamily: theme.fontMono, letterSpacing: "0.04em",
                        }}>
                          COMPETITOR URLs ({competitors.filter(c => c.trim()).length}/{maxCompetitors})
                        </div>
                        {competitors.map((comp, i) => (
                          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                            <input type="text" value={comp}
                              onChange={e => {
                                const next = [...competitors];
                                next[i] = e.target.value;
                                setCompetitors(next);
                              }}
                              placeholder={`competitor${i + 1}.com`}
                              style={{
                                flex: 1, padding: "10px 14px", borderRadius: 8,
                                border: `1px solid ${theme.cardBorder}`, background: theme.card,
                                color: theme.text, fontSize: 13, fontFamily: theme.fontMono,
                                outline: "none", transition: "border-color 0.2s",
                              }}
                              onFocus={e => e.target.style.borderColor = theme.accentDim}
                              onBlur={e => e.target.style.borderColor = theme.cardBorder}
                            />
                            {competitors.length > 1 && (
                              <button onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
                                style={{
                                  width: 36, borderRadius: 8, border: `1px solid ${theme.cardBorder}`,
                                  background: "transparent", color: theme.textDim, fontSize: 16,
                                  cursor: "pointer", transition: "all 0.2s",
                                }}
                                onMouseEnter={e => { e.target.style.borderColor = "rgba(255,77,106,0.3)"; e.target.style.color = theme.danger; }}
                                onMouseLeave={e => { e.target.style.borderColor = theme.cardBorder; e.target.style.color = theme.textDim; }}
                              >&times;</button>
                            )}
                          </div>
                        ))}
                        {competitors.length < maxCompetitors && (
                          <button onClick={() => setCompetitors([...competitors, ""])}
                            style={{
                              padding: "8px 14px", borderRadius: 8,
                              border: `1px dashed ${theme.cardBorder}`, background: "transparent",
                              color: theme.textMuted, fontSize: 11, cursor: "pointer",
                              fontFamily: theme.fontMono, width: "100%", transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { e.target.style.borderColor = theme.accentDim; e.target.style.color = theme.accent; }}
                            onMouseLeave={e => { e.target.style.borderColor = theme.cardBorder; e.target.style.color = theme.textMuted; }}
                          >+ Add competitor</button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <button onClick={() => setShowPricing(true)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "8px 18px", borderRadius: 8,
                        background: "transparent", border: `1px solid ${theme.cardBorder}`,
                        color: theme.textDim, fontSize: 12, cursor: "pointer",
                        fontFamily: theme.fontBody, transition: "all 0.25s",
                      }}
                      onMouseEnter={e => { e.target.style.borderColor = theme.proBorder; e.target.style.color = theme.pro; }}
                      onMouseLeave={e => { e.target.style.borderColor = theme.cardBorder; e.target.style.color = theme.textDim; }}
                    >
                      + Compare with competitors
                      <TierBadge tier="pro" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── Scan Progress ─── */}
            {scanning && (
              <div className="fade-up" style={{ maxWidth: 640, margin: "0 auto" }}>
                <div className="sap-scan-progress" style={{
                  background: theme.surface,
                  borderRadius: 16,
                  padding: 28,
                  border: `1px solid ${theme.cardBorder}`,
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Animated scan beam */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${theme.accent}, ${theme.violet}, transparent)`,
                    animation: "scanBeam 2s ease-in-out infinite",
                  }} />

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "baseline" }}>
                    <span style={{ color: theme.textMuted, fontSize: 13, fontWeight: 500 }}>{scanStage}</span>
                    <span style={{
                      color: theme.accent, fontSize: 14, fontFamily: theme.fontMono, fontWeight: 600,
                    }}>
                      {Math.round(scanProgress)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 4, background: theme.cardBorder, borderRadius: 2,
                    overflow: "hidden", position: "relative",
                  }}>
                    <div style={{
                      height: "100%", width: `${scanProgress}%`, borderRadius: 2,
                      background: `linear-gradient(90deg, ${theme.accent}, ${theme.violet})`,
                      transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
                      boxShadow: `0 0 12px ${theme.accent}40`,
                    }} />
                  </div>

                  {/* Stage pills */}
                  <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                    {stages.map((s, i) => {
                      const done = scanProgress >= ((i + 1) / stages.length) * 100;
                      return (
                        <span key={i} style={{
                          fontSize: 10, padding: "4px 10px", borderRadius: 6,
                          background: done ? theme.accentGlow : "rgba(255,255,255,0.02)",
                          color: done ? theme.accent : theme.textDim,
                          fontFamily: theme.fontMono,
                          transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                          border: `1px solid ${done ? "rgba(0,245,212,0.15)" : "transparent"}`,
                        }}>{s.replace("...", "")}</span>
                      );
                    })}
                    {scanMode === "site" && (
                      <button onClick={cancelScan} style={{
                        marginLeft: "auto", fontSize: 11, padding: "4px 14px", borderRadius: 6,
                        background: "rgba(255,77,106,0.08)", color: theme.danger,
                        border: `1px solid rgba(255,77,106,0.2)`, cursor: "pointer",
                        fontFamily: theme.fontMono, fontWeight: 500,
                      }}>Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Error ─── */}
            {scanError && (
              <div className="fade-up" style={{
                maxWidth: 640, margin: "0 auto 24px", padding: "16px 20px",
                background: theme.dangerGlow,
                borderRadius: 14,
                border: `1px solid rgba(255,77,106,0.2)`,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(255,77,106,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                }}>!</div>
                <div>
                  <div style={{ color: theme.danger, fontSize: 14, fontWeight: 600, fontFamily: theme.fontDisplay }}>Scan Failed</div>
                  <div style={{ color: theme.textMuted, fontSize: 13, marginTop: 3 }}>{scanError}</div>
                </div>
              </div>
            )}

            {/* ─── Feature grid ─── */}
            {!scanning && !showResults && (
              <div className="sap-feature-grid" style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
                maxWidth: 740, margin: "0 auto",
              }}>
                {[
                  { label: "SEO Audit", free: "Basic checks", pro: "Full checks", premium: "Full + scheduled" },
                  { label: "AI Search", free: "Basic checks", pro: "Full analysis", premium: "Full analysis" },
                  { label: "Marketing", free: "Basic checks", pro: "Full analysis", premium: "Full + competitors" },
                  { label: "Integrations", free: "—", pro: "GSC + WordPress", premium: "All 6 platforms" },
                  { label: "Page Audit", free: "50 pages", pro: "500 pages", premium: "5000 pages" },
                  { label: "Export", free: "—", pro: "PDF", premium: "PDF + DOCX + API" },
                ].map((row, i) => (
                  <div key={i} className="card-hover" style={{
                    padding: "16px 18px",
                    background: theme.surface,
                    borderRadius: 12,
                    border: `1px solid ${theme.cardBorder}`,
                    animationDelay: `${i * 60}ms`,
                  }}>
                    <div style={{
                      fontSize: 10, color: theme.textDim, marginBottom: 8,
                      fontFamily: theme.fontMono, letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>{row.label}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: tier === "free" ? theme.text : tier === "pro" ? theme.pro : theme.premium,
                    }}>
                      {tier === "free" ? row.free : tier === "pro" ? row.pro : row.premium}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ACCOUNT VIEW ═══ */}
        {view === "account" && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: theme.textMuted }}>Loading...</div>}>
          <AccountPage
            user={user}
            tier={tier}
            onBack={() => { setView("scan"); setAccountInitialSection(null); setOauthError(null); }}
            onSignOut={signOut}
            gscStatus={gscStatus}
            setGscStatus={setGscStatus}
            ga4Status={ga4Status}
            setGa4Status={setGa4Status}
            adobeAnalyticsStatus={adobeAnalyticsStatus}
            setAdobeAnalyticsStatus={setAdobeAnalyticsStatus}
            metaStatus={metaStatus}
            setMetaStatus={setMetaStatus}
            connectedIntegrations={connectedIntegrations}
            setConnectedIntegrations={setConnectedIntegrations}
            results={results}
            initialSection={accountInitialSection}
            isAdmin={isAdmin}
            onTierChange={(t) => setTier(t === null ? dbTier : t)}
            profileData={profileData}
            onProfileUpdate={setProfileData}
            onNavigateToSupport={() => { setSupportInitialSection(null); setView("support"); }}
            oauthError={oauthError}
            onClearOauthError={() => setOauthError(null)}
          />
          </Suspense>
        )}

        {/* ═══ PAGE AUDIT VIEW ═══ */}
        {view === "audit" && (
          <PageAuditApp
            userTier={tier}
            token={session?.access_token}
            onUpgrade={() => setShowPricing(true)}
            initialUrl={url}
          />
        )}

        {/* ═══ SUPPORT VIEW ═══ */}
        {view === "support" && (
          <Suspense fallback={null}>
            <SupportPage
              initialSection={supportInitialSection}
              initialTicketId={supportInitialTicket}
              onBack={() => setView(showResults ? "results" : "scan")}
            />
          </Suspense>
        )}

        {/* ═══ RESULTS VIEW ═══ */}
        {view === "results" && showResults && (
          <div className="fade-up">

            {/* ─── Score Overview ─── */}
            <div className="sap-score-overview" style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, marginBottom: 28,
              background: theme.surface,
              borderRadius: 18,
              padding: "28px 32px",
              border: `1px solid ${theme.cardBorder}`,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Subtle radial glow behind score */}
              <div className="sap-score-glow" style={{
                position: "absolute", left: 30, top: "50%", transform: "translateY(-50%)",
                width: 200, height: 200, borderRadius: "50%",
                background: `radial-gradient(circle, ${overallScore >= 75 ? "rgba(0,245,212,0.06)" : overallScore >= 45 ? "rgba(255,178,36,0.06)" : "rgba(255,77,106,0.06)"}, transparent 70%)`,
                pointerEvents: "none",
              }} />

              <div className="sap-score-overview-ring" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <ScoreRing score={overallScore} size={120} strokeWidth={6} glowing />
                <div style={{
                  marginTop: 10, fontSize: 10, color: theme.textDim,
                  fontFamily: theme.fontMono, letterSpacing: "0.08em", textTransform: "uppercase",
                }}>Overall</div>
              </div>

              <div>
                <div className="sap-url-header" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <span className="sap-url-text" style={{
                    fontFamily: theme.fontDisplay, fontSize: 20, fontWeight: 700,
                    letterSpacing: "-0.02em",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{url || "example.com"}</span>
                  <TierBadge tier={tier} />
                  <button onClick={() => { reset(); setView("scan"); }} style={{
                    marginLeft: "auto",
                    padding: "6px 16px", borderRadius: 8,
                    border: `1px solid ${theme.accentDim}`,
                    background: theme.accentGlow, color: theme.accent,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: theme.fontMono, letterSpacing: "0.04em",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}>New Scan</button>
                  {results?.platform?.cms && (
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: theme.fontMono,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      background: `${theme.info}12`,
                      border: `1px solid ${theme.info}30`,
                      color: theme.info,
                      whiteSpace: "nowrap",
                    }}>
                      {results.platform.cms.name}{results.platform.cms.version ? ` ${results.platform.cms.version}` : ""}
                    </span>
                  )}
                </div>
                <div style={{
                  color: theme.textDim, fontSize: 11, marginBottom: 18,
                  fontFamily: theme.fontMono, letterSpacing: "0.02em",
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                }}>
                  <span>Scanned {new Date().toLocaleDateString()} · {features.pages}</span>
                  {results?.platform?.technologies?.length > 0 && (
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: theme.cardBorder }}>·</span>
                      {results.platform.technologies.map((tech) => (
                        <span key={tech.id} style={{
                          padding: "1px 7px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontFamily: theme.fontMono,
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${theme.cardBorder}`,
                          color: theme.textMuted,
                        }}>
                          {tech.name}
                        </span>
                      ))}
                    </span>
                  )}
                </div>

                {/* Category scores */}
                <div className="sap-category-scores" style={{ display: "flex", gap: 10 }}>
                  {[
                    { label: "SEO", score: seoScore, color: theme.accent, available: true },
                    { label: "AI Search", score: llmScore, color: theme.info, available: true },
                    { label: "Marketing", score: mktScore, color: theme.warning, available: true },
                    { label: "Speed", score: perfScore, color: theme.violet, available: hasPerfData, note: "Core Web Vitals unavailable — set a PSI_API_KEY to enable performance data" },
                  ].map(cat => (
                    <div key={cat.label} title={cat.available ? undefined : cat.note} style={{
                      flex: 1, padding: "14px 16px", borderRadius: 12,
                      background: cat.available ? `${cat.color}08` : "rgba(255,255,255,0.01)",
                      border: `1px solid ${cat.available ? `${cat.color}18` : theme.cardBorder}`,
                      opacity: cat.available ? 1 : 0.35,
                      transition: "all 0.3s",
                    }}>
                      <div className="sap-category-score-value" style={{
                        fontSize: 28, fontWeight: 800, fontFamily: theme.fontDisplay,
                        color: cat.available ? cat.color : theme.textDim,
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                      }}>
                        {cat.available ? cat.score : "—"}
                      </div>
                      <div style={{
                        fontSize: 10, color: theme.textMuted, marginTop: 5,
                        fontFamily: theme.fontMono, letterSpacing: "0.04em", textTransform: "uppercase",
                      }}>
                        {cat.label}{!cat.available && " (n/a)"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="sap-result-tabs" style={{
              display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 22, padding: 3,
              background: theme.surface, borderRadius: 10,
              border: `1px solid ${theme.cardBorder}`,
            }}>
              {[
                ...(siteResults ? [{ id: "site-overview", label: "Site Overview", icon: "◫", available: true }] : []),
                { id: "seo", label: "SEO", icon: "🔍", available: true },
                { id: "llm", label: "AI Search", icon: "🤖", available: true },
                { id: "marketing", label: "Marketing", icon: "📣", available: true },
                { id: "competitors", label: "Competitors", icon: "⚔", available: tierAtLeast(tier, "pro"), minTier: "pro" },
                { id: "insights", label: "Insights", icon: "💡", available: true },
                { id: "ai", label: "AI Assistant", icon: "✦", available: tierAtLeast(tier, "pro"), minTier: "pro" },
                ...((results?.wordpress?.available || results?.platform?.cms?.id === "wordpress") ? [{ id: "wordpress", label: "WordPress", icon: "◉", available: tierAtLeast(tier, "pro"), minTier: "pro" }] : []),
                ...(results?.shopify?.available ? [{ id: "shopify", label: "Shopify", icon: "🛒", available: tierAtLeast(tier, "premium"), minTier: "premium" }] : []),
                { id: "gsc", label: "Search Console", icon: "📊", available: tierAtLeast(tier, "pro"), minTier: "pro" },
                { id: "ga4", label: "Analytics", icon: "📈", available: tierAtLeast(tier, "premium"), minTier: "premium" },
                ...((results?.ads?.available || (ga4Status.connected && tierAtLeast(tier, "premium"))) ? [{ id: "ads", label: "Google Ads", icon: "📢", available: tierAtLeast(tier, "premium"), minTier: "premium" }] : []),
                { id: "meta", label: "Meta", icon: "📘", available: tierAtLeast(tier, "premium"), minTier: "premium" },
                { id: "trends", label: "Trends", icon: "📉", available: tierAtLeast(tier, "premium"), minTier: "premium" },
                { id: "speed", label: "Performance", icon: "⚡", available: true },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  style={{ opacity: tab.available ? 1 : 0.45 }}>
                  <span style={{ fontSize: 13 }}>{tab.icon}</span> {tab.label}
                  {!tab.available && <span style={{ marginLeft: 2 }}><TierBadge tier={tab.minTier || "pro"} /></span>}
                </button>
              ))}
            </div>

            {/* ─── Site Overview Tab ─── */}
            {activeTab === "site-overview" && siteResults && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`, overflow: "hidden",
              }}>
                <div style={{ padding: "20px 22px 0" }}>
                  <SectionHeader icon="◫" title="Site-Wide Analysis"
                    subtitle={`${siteResults.aggregate?.pagesScanned || 0} pages scanned${siteResults.aggregate?.pagesFailed ? ` · ${siteResults.aggregate.pagesFailed} failed` : ""}`} />
                </div>

                {/* Aggregate scores */}
                <div style={{ padding: "16px 22px", display: "flex", gap: 10 }}>
                  {[
                    { label: "SEO", score: siteResults.aggregate?.scores?.seo ?? 0, color: theme.accent },
                    { label: "AI Search", score: siteResults.aggregate?.scores?.llm ?? 0, color: theme.info },
                    { label: "Marketing", score: siteResults.aggregate?.scores?.marketing ?? 0, color: theme.warning },
                    { label: "Speed", score: siteResults.aggregate?.scores?.performance ?? 0, color: theme.violet },
                  ].map(cat => (
                    <div key={cat.label} style={{
                      flex: 1, padding: "14px 16px", borderRadius: 12,
                      background: `${cat.color}08`, border: `1px solid ${cat.color}18`,
                    }}>
                      <div style={{
                        fontSize: 28, fontWeight: 800, fontFamily: theme.fontDisplay,
                        color: cat.color, letterSpacing: "-0.02em", lineHeight: 1,
                      }}>{cat.score}</div>
                      <div style={{
                        fontSize: 10, color: theme.textMuted, marginTop: 5,
                        fontFamily: theme.fontMono, letterSpacing: "0.04em", textTransform: "uppercase",
                      }}>{cat.label} avg</div>
                    </div>
                  ))}
                </div>

                {/* Common Issues */}
                {siteResults.aggregate?.commonIssues?.length > 0 && (
                  <div style={{ padding: "0 22px 16px" }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 10,
                      fontFamily: theme.fontMono, letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>Common Issues Across Pages</div>
                    {siteResults.aggregate.commonIssues.slice(0, 10).map((issue, i) => {
                      const isExpanded = expandedIssues[i];
                      const pct = Math.round((issue.affectedPages / issue.totalPages) * 100);
                      const severityColor = pct >= 80 ? theme.danger : pct >= 50 ? theme.warn : theme.textMuted;
                      return (
                        <div key={i} style={{ marginBottom: 4 }}>
                          <div
                            onClick={() => setExpandedIssues(prev => ({ ...prev, [i]: !prev[i] }))}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 14px", borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                              background: theme.surface, border: `1px solid ${theme.cardBorder}`,
                              cursor: "pointer", transition: "background 0.15s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 11, color: theme.textMuted, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>&#9654;</span>
                              <span style={{ fontSize: 13, color: theme.text }}>{issue.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <div style={{ width: 60, height: 4, borderRadius: 2, background: `${severityColor}22`, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: severityColor }} />
                              </div>
                              <span style={{
                                fontSize: 11, fontFamily: theme.fontMono, color: severityColor,
                                background: `${severityColor}12`, padding: "3px 10px", borderRadius: 6,
                              }}>
                                {issue.affectedPages}/{issue.totalPages} pages
                              </span>
                            </div>
                          </div>
                          {isExpanded && (
                            <div style={{
                              background: `${theme.surface}cc`, border: `1px solid ${theme.cardBorder}`,
                              borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 14px",
                            }}>
                              {issue.detail && (
                                <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                                  {issue.detail}
                                </div>
                              )}
                              <div style={{ fontSize: 11, fontFamily: theme.fontMono, color: theme.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Affected Pages
                              </div>
                              {(issue.pages || []).map((p, j) => {
                                let path;
                                try { path = new URL(p.url).pathname || "/"; } catch { path = p.url; }
                                const scoreColor = (p.score || 0) >= 45 ? theme.warn : theme.danger;
                                return (
                                  <div key={j} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "5px 0", borderBottom: j < (issue.pages || []).length - 1 ? `1px solid ${theme.cardBorder}44` : "none",
                                  }}>
                                    <span style={{ fontSize: 12, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }} title={p.url}>
                                      {path}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      {p.detail && p.detail !== issue.detail && (
                                        <span style={{ fontSize: 11, color: theme.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.detail}>
                                          {p.detail}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: 11, fontFamily: theme.fontMono, color: scoreColor,
                                        background: `${scoreColor}15`, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                                      }}>
                                        {p.score}/100
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Per-Page Breakdown */}
                <div style={{ padding: "0 22px 20px" }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 10,
                    fontFamily: theme.fontMono, letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>Per-Page Scores</div>
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {siteResults.pages.map((page, i) => {
                      const pageUrl = page.url || `Page ${i + 1}`;
                      const isError = !!page.error && !page.scores;
                      const isPrimary = pageUrl === siteResults.primaryUrl;
                      const displayUrl = (() => {
                        try { return new URL(pageUrl).pathname || "/"; } catch { return pageUrl; }
                      })();
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", marginBottom: 4, borderRadius: 10,
                          background: isPrimary ? `${theme.accent}08` : theme.surface,
                          border: `1px solid ${isPrimary ? `${theme.accent}20` : theme.cardBorder}`,
                        }}>
                          <span style={{
                            flex: 1, fontSize: 13, fontFamily: theme.fontMono,
                            color: isError ? theme.danger : theme.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }} title={pageUrl}>
                            {isPrimary && <span style={{ color: theme.accent, marginRight: 6, fontSize: 10 }}>PRIMARY</span>}
                            {displayUrl}
                          </span>
                          {isError ? (
                            <span style={{ fontSize: 11, color: theme.danger, fontFamily: theme.fontMono }}>Error</span>
                          ) : (
                            <div style={{ display: "flex", gap: 8 }}>
                              {[
                                { label: "SEO", score: page.scores?.seo, color: theme.accent },
                                { label: "AI", score: page.scores?.llm, color: theme.info },
                                { label: "MKT", score: page.scores?.marketing, color: theme.warning },
                                { label: "SPD", score: page.scores?.performance, color: theme.violet },
                              ].map(s => (
                                <span key={s.label} style={{
                                  fontSize: 11, fontFamily: theme.fontMono, fontWeight: 600,
                                  color: (s.score ?? 0) >= 75 ? s.color : (s.score ?? 0) >= 45 ? theme.warning : theme.danger,
                                  minWidth: 28, textAlign: "center",
                                }} title={s.label}>{s.score ?? "—"}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {results.classification && (
              <div style={{ padding: "0 8px" }}>
                <ClassificationCard classification={results.classification} />
              </div>
            )}

            {/* ─── SEO Tab ─── */}
            {activeTab === "seo" && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`, overflow: "hidden",
              }}>
                <div style={{ padding: "20px 22px 0" }}>
                  <SectionHeader icon="🔍" title="Technical SEO Audit"
                    subtitle={tier === "free" ? "Homepage · 5 basic checks — upgrade for full audit"
                      : tier === "pro" ? "All checks included"
                      : "All checks included"} />
                </div>
                <div style={{ padding: "0 8px 8px" }}>
                  <SeverityGroupedList
                    items={results.seo.slice(0, visibleSeoChecks)}
                    gateFails={tier === "free"}
                    renderItem={(item, key, index, blurred) => (
                      <CheckRow key={key} item={item} index={index} blurred={blurred} />
                    )}
                  />
                  {tier === "free" && results.seo.slice(visibleSeoChecks).map((item, i) => (
                    <CheckRow key={`b-${i}`} item={item} index={i + visibleSeoChecks} blurred={true} />
                  ))}
                </div>
                {tier === "free" && hiddenSeoCount > 0 && (
                  <UpgradeBanner requiredTier="pro" compact featureDesc={`${hiddenSeoCount} more checks available with Pro`} />
                )}
                {tierAtLeast(tier, "premium") && (
                  <div style={{
                    margin: "0 8px 8px", padding: "14px 18px", borderRadius: 12,
                    background: theme.premiumGlow, border: `1px solid ${theme.premiumBorder}`,
                  }}>
                    <div style={{ fontSize: 13, color: theme.premium, fontWeight: 700, fontFamily: theme.fontDisplay, marginBottom: 4 }}>Premium: Scheduled Monitoring</div>
                    <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6 }}>
                      Weekly automated re-scans track SEO regressions and alert you by email when scores drop.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── LLM Tab ─── */}
            {activeTab === "llm" && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: 24, position: "relative", minHeight: 300,
              }}>
                <SectionHeader icon="🤖" title="AI Search Readiness"
                  subtitle={tier === "free"
                    ? "3 basic checks — upgrade for full AI search analysis"
                    : "How well can AI systems understand and cite your content?"} />
                <div style={{ display: "grid", gap: 10 }}>
                  <SeverityGroupedList
                    items={results.llm.slice(0, visibleLlmChecks)}
                    gateFails={tier === "free"}
                    wrapItemsStyle={{ display: "grid", gap: 10, padding: "0 4px" }}
                    renderItem={(item, key, _index, blurred) => (
                      <ScoreCard key={key} item={item} blurred={blurred} />
                    )}
                  />
                  {hiddenLlmCount > 0 && results.llm.slice(visibleLlmChecks).map((item, i) => (
                    <ScoreCard key={`b-${i}`} item={item} blurred={true} />
                  ))}
                </div>
                {hiddenLlmCount > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <UpgradeBanner requiredTier="pro" compact
                      featureDesc={`${hiddenLlmCount} more AI search checks available with Pro — citation analysis, entity recognition, and more`} />
                  </div>
                )}
              </div>
            )}

            {/* ─── Marketing Tab ─── */}
            {activeTab === "marketing" && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: 24, position: "relative", minHeight: 300,
              }}>
                <SectionHeader icon="📣" title="Marketing Effectiveness"
                  subtitle={tier === "free"
                    ? "3 basic checks — upgrade for full marketing analysis"
                    : "Value proposition, CTAs, trust signals, and messaging analysis"} />
                <div style={{ display: "grid", gap: 10 }}>
                  <SeverityGroupedList
                    items={results.marketing.slice(0, visibleMktChecks)}
                    gateFails={tier === "free"}
                    wrapItemsStyle={{ display: "grid", gap: 10, padding: "0 4px" }}
                    renderItem={(item, key, _index, blurred) => (
                      <ScoreCard key={key} item={item} blurred={blurred} />
                    )}
                  />
                  {hiddenMktCount > 0 && results.marketing.slice(visibleMktChecks).map((item, i) => (
                    <ScoreCard key={`b-${i}`} item={item} blurred={true} />
                  ))}
                </div>
                {hiddenMktCount > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <UpgradeBanner requiredTier="pro" compact
                      featureDesc={`${hiddenMktCount} more marketing checks available with Pro — social proof, reviews, video analysis, and more`} />
                  </div>
                )}
                {features.marketing && features.competitors > 0 && (
                  <div style={{
                    marginTop: 18, padding: "14px 18px", borderRadius: 12,
                    background: tier === "premium" ? theme.premiumGlow : theme.proGlow,
                    border: `1px solid ${tier === "premium" ? theme.premiumBorder : theme.proBorder}`,
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, fontFamily: theme.fontDisplay, marginBottom: 4,
                      color: tier === "premium" ? theme.premium : theme.pro,
                    }}>
                      Competitor Benchmarking
                    </div>
                    <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6 }}>
                      Compare against up to {features.competitors} competitor{features.competitors > 1 ? "s" : ""}. Add competitor URLs in scan settings for side-by-side scores.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Competitors Tab ─── */}
            {activeTab === "competitors" && comparisonResults && (
              <Suspense fallback={null}>
              <CompetitorPanel
                primary={comparisonResults.primary}
                competitors={comparisonResults.competitors}
              />
              </Suspense>
            )}
            {activeTab === "competitors" && !comparisonResults && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{
                  fontSize: 36, marginBottom: 14, opacity: 0.5,
                }}>⚔</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>No Competitor Data</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  Add competitor URLs before scanning to see a side-by-side comparison with radar charts, category breakdowns, and win/loss analysis.
                </div>
                {maxCompetitors > 0 ? (
                  <button onClick={() => { reset(); setView("scan"); setShowCompetitorInputs(true); }}
                    style={{
                      padding: "10px 24px", borderRadius: 10,
                      border: `1px solid ${theme.accentDim}`,
                      background: theme.accentGlow, color: theme.accent,
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: theme.fontDisplay, transition: "all 0.2s",
                    }}>
                    Add Competitors & Re-scan
                  </button>
                ) : (
                  <UpgradeBanner requiredTier="pro" compact featureDesc="Competitor benchmarking requires Pro or Premium" />
                )}
              </div>
            )}

            {/* ─── Insights Tab ─── */}
            {activeTab === "insights" && (
              <Suspense fallback={null}>
              <InsightsPanel results={results} scores={results?.scores} tier={tier}
                onGenerateSummary={handleGenerateSummary}
                summaryLoading={summaryState.loading}
                summaryData={summaryState.summary}
                summaryError={summaryState.error}
                userTier={tier}
                onUpgrade={() => setShowPricing(true)}
                industry={profileData?.industry || ""} />
              </Suspense>
            )}

            {/* ─── AI Assistant Tab ─── */}
            {activeTab === "ai" && (
              <div style={{
                background: theme.card,
                borderRadius: 16,
                border: `1px solid ${theme.cardBorder}`,
                padding: 24,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
                }}>
                  <span style={{ fontSize: 20, color: theme.violet }}>✦</span>
                  <div>
                    <div style={{
                      fontSize: 18, fontWeight: 700, color: theme.text,
                      fontFamily: theme.fontDisplay,
                    }}>AI Assistant</div>
                    <div style={{
                      fontSize: 12, color: theme.textMuted, marginTop: 2,
                    }}>AI-powered analysis of your scan results</div>
                  </div>
                </div>
                <AISummaryCard
                  summary={summaryState.summary}
                  loading={summaryState.loading}
                  error={summaryState.error}
                  onGenerate={handleGenerateSummary}
                  userTier={tier}
                  onUpgrade={() => setShowPricing(true)}
                  industry={profileData?.industry || ""}
                />
              </div>
            )}

            {/* ─── WordPress Tab ─── */}
            {activeTab === "wordpress" && results?.wordpress?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                overflow: "hidden",
              }}>
                <div style={{ padding: "20px 22px 0" }}>
                  <SectionHeader icon="◉" title="WordPress Insights"
                    subtitle={`Data sourced from ${results.wordpress.site?.name || "WordPress"} REST API — no authentication required`} />
                </div>

                {/* Site Info Bar */}
                {results.wordpress.site && (
                  <div style={{
                    margin: "0 12px 12px", padding: "14px 18px", borderRadius: 12,
                    background: "rgba(33,150,243,0.06)", border: "1px solid rgba(33,150,243,0.12)",
                    display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>◉</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: theme.fontDisplay, color: theme.text }}>
                          {results.wordpress.site.name || "WordPress Site"}
                        </div>
                        {results.wordpress.site.description && (
                          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                            {results.wordpress.site.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                      {results.wordpress.seo?.plugin && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          fontFamily: theme.fontMono, background: theme.accentGlow,
                          border: `1px solid ${theme.accentDim}`, color: theme.accent,
                        }}>{results.wordpress.seo.plugin}</span>
                      )}
                      {results.wordpress.seo?.woocommerce && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          fontFamily: theme.fontMono, background: theme.warningGlow,
                          border: "1px solid rgba(255,178,36,0.2)", color: theme.warning,
                        }}>WooCommerce</span>
                      )}
                      {results.wordpress.seo?.jetpack && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          fontFamily: theme.fontMono, background: "rgba(167,119,255,0.08)",
                          border: "1px solid rgba(167,119,255,0.2)", color: theme.violet,
                        }}>Jetpack</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Stats */}
                {results.wordpress.content && (
                  <div style={{
                    margin: "0 12px 12px", display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8,
                  }}>
                    {[
                      { label: "Posts", value: results.wordpress.content.posts, icon: "📝" },
                      { label: "Pages", value: results.wordpress.content.pages, icon: "📄" },
                      { label: "Categories", value: results.wordpress.taxonomy?.categories || 0, icon: "📂" },
                      { label: "Tags", value: results.wordpress.taxonomy?.tags || 0, icon: "🏷" },
                      { label: "Avg Words", value: results.wordpress.content.avgWordCount ?? "—", icon: "📊" },
                      { label: "Avg Days / Post", value: results.wordpress.content.avgDaysBetweenPosts ?? "—", icon: "📅" },
                      { label: "Days Since Post", value: results.wordpress.content.daysSinceLastPost ?? "—", icon: "⏱" },
                      { label: "Media Images", value: results.wordpress.media?.total ?? "—", icon: "🖼" },
                      ...(results.wordpress.woocommerce ? [
                        { label: "Products", value: results.wordpress.woocommerce.products, icon: "🛍" },
                      ] : []),
                    ].map((stat) => (
                      <div key={stat.label} style={{
                        padding: "14px 16px", borderRadius: 12, background: theme.surface,
                        border: `1px solid ${theme.cardBorder}`, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>{stat.icon}</div>
                        <div style={{
                          fontSize: 22, fontWeight: 800, fontFamily: theme.fontDisplay,
                          color: theme.text, lineHeight: 1,
                        }}>{stat.value}</div>
                        <div style={{
                          fontSize: 10, color: theme.textMuted, marginTop: 6,
                          fontFamily: theme.fontMono, letterSpacing: "0.04em", textTransform: "uppercase",
                        }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* WP Checks */}
                <div style={{ padding: "0 8px 8px" }}>
                  <SeverityGroupedList
                    items={results.wordpress.checks || []}
                    renderItem={(item, key, index, blurred) => (
                      <CheckRow key={key} item={item} index={index} blurred={blurred} />
                    )}
                  />
                </div>

                {/* Latest Post */}
                {results.wordpress.content?.latestPostTitle && (
                  <div style={{
                    margin: "0 12px 12px", padding: "14px 18px", borderRadius: 12,
                    background: theme.surface, border: `1px solid ${theme.cardBorder}`,
                  }}>
                    <div style={{
                      fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono,
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
                    }}>Latest Post</div>
                    <div style={{ fontSize: 13, color: theme.text, fontWeight: 600, fontFamily: theme.fontDisplay }}>
                      {results.wordpress.content.latestPostTitle}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                      {new Date(results.wordpress.content.latestPostDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "wordpress" && !results?.wordpress?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>◉</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>{results?.platform?.cms?.id === "wordpress" ? "WordPress REST API Not Accessible" : "Not a WordPress Site"}</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  {results?.platform?.cms?.id === "wordpress"
                    ? "WordPress was detected but the REST API (/wp-json/) is not accessible. A security plugin or server configuration may be blocking it. WordPress insights like content stats, SEO plugin analysis, and publishing frequency require the REST API to be enabled."
                    : "The scanned site does not appear to be powered by WordPress. This tab automatically activates when a WordPress site is detected, providing insights from the WP REST API including content stats, SEO plugin analysis, and publishing frequency."}
                </div>
              </div>
            )}

            {/* ─── Shopify Tab ─── */}
            {activeTab === "shopify" && results?.shopify?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                overflow: "hidden",
              }}>
                <div style={{ padding: "20px 22px 0" }}>
                  <SectionHeader icon="🛒" title="Shopify Insights"
                    subtitle={`Data sourced from ${results.shopify.store?.name || "Shopify"} storefront — no authentication required`} />
                </div>

                {/* Store Info Bar */}
                {results.shopify.store && (
                  <div style={{
                    margin: "0 12px 12px", padding: "14px 18px", borderRadius: 12,
                    background: "rgba(150,191,72,0.06)", border: "1px solid rgba(150,191,72,0.12)",
                    display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🛒</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: theme.fontDisplay, color: theme.text }}>
                          {results.shopify.store.name || "Shopify Store"}
                        </div>
                        {results.shopify.store.description && (
                          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {results.shopify.store.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                      {results.shopify.store.currency && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          fontFamily: theme.fontMono, background: theme.warningGlow,
                          border: "1px solid rgba(255,178,36,0.2)", color: theme.warning,
                        }}>{results.shopify.store.currency}</span>
                      )}
                      {results.shopify.ecommerce?.hasReviews && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          fontFamily: theme.fontMono, background: theme.accentGlow,
                          border: `1px solid ${theme.accentDim}`, color: theme.accent,
                        }}>Reviews</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Product & Collection Stats */}
                {(results.shopify.products || results.shopify.collections) && (
                  <div style={{
                    margin: "0 12px 12px", display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8,
                  }}>
                    {[
                      ...(results.shopify.products ? [
                        { label: "Products", value: results.shopify.products.total, icon: "📦" },
                        { label: "Variants", value: results.shopify.products.totalVariants, icon: "🔀" },
                        { label: "Images", value: results.shopify.products.totalImages, icon: "🖼" },
                      ] : []),
                      ...(results.shopify.collections ? [
                        { label: "Collections", value: results.shopify.collections.total, icon: "📂" },
                      ] : []),
                      ...(results.shopify.pages ? [
                        { label: "Pages", value: results.shopify.pages.total, icon: "📄" },
                      ] : []),
                      ...(results.shopify.seo ? [
                        { label: "OG Tags", value: `${results.shopify.seo.ogComplete}/${results.shopify.seo.ogTotal}`, icon: "🔗" },
                        { label: "Schema Fields", value: `${results.shopify.ecommerce?.schemaCompleteness || 0}/${results.shopify.ecommerce?.schemaTotalFields || 6}`, icon: "📋" },
                      ] : []),
                    ].map((stat) => (
                      <div key={stat.label} style={{
                        padding: "14px 16px", borderRadius: 12, background: theme.surface,
                        border: `1px solid ${theme.cardBorder}`, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>{stat.icon}</div>
                        <div style={{
                          fontSize: 22, fontWeight: 800, fontFamily: theme.fontDisplay,
                          color: theme.text, lineHeight: 1,
                        }}>{stat.value}</div>
                        <div style={{
                          fontSize: 10, color: theme.textMuted, marginTop: 6,
                          fontFamily: theme.fontMono, letterSpacing: "0.04em", textTransform: "uppercase",
                        }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Shopify Checks */}
                <div style={{ padding: "0 8px 8px" }}>
                  <SeverityGroupedList
                    items={results.shopify.checks || []}
                    renderItem={(item, key, index, blurred) => (
                      <CheckRow key={key} item={item} index={index} blurred={blurred} />
                    )}
                  />
                </div>
              </div>
            )}
            {activeTab === "shopify" && !results?.shopify?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>🛒</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>Not a Shopify Site</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  The scanned site does not appear to be powered by Shopify. This tab automatically activates when a Shopify store is detected, providing product catalog analysis, collection quality, schema validation, and e-commerce SEO checks.
                </div>
              </div>
            )}

            {/* ─── Meta Business Tab ─── */}
            {activeTab === "meta" && results?.metaBusiness?.available && (
              <MetaPanel
                data={results.metaBusiness}
                score={results.scores?.meta}
              />
            )}
            {activeTab === "meta" && !results?.metaBusiness?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>📘</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>{metaStatus.connected ? "No Meta Data Available" : "Meta Business Not Connected"}</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  {metaStatus.connected
                    ? "Your Meta Business account is connected, but no page is selected or the selected page has no data. Check your page selection in the Integrations tab."
                    : "Connect your Meta Business account to see Facebook Page insights, Meta Pixel status, and engagement metrics."}
                </div>
                {!tierAtLeast(tier, "premium") && (
                  <UpgradeBanner requiredTier="premium" compact featureDesc="Meta Business integration requires Premium" />
                )}
              </div>
            )}

            {/* ─── GSC Tab ─── */}
            {activeTab === "gsc" && results?.gsc?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                overflow: "hidden",
              }}>
                <div style={{ padding: "20px 22px 0" }}>
                  <SectionHeader icon="📊" title="Google Search Console"
                    subtitle={`Search performance data for ${results.gsc.property || "connected property"} — last 28 days`} />
                </div>

                {/* Property Info Bar */}
                <div style={{
                  margin: "0 12px 12px", padding: "14px 18px", borderRadius: 12,
                  background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.12)",
                  display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🔗</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: theme.fontDisplay, color: theme.text }}>
                        {results.gsc.property || "Search Console Property"}
                      </div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        Connected via Google OAuth2
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Stats Grid */}
                {results.gsc.performance && (
                  <div style={{
                    margin: "0 12px 12px", display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8,
                  }}>
                    {[
                      { label: "Total Clicks", value: results.gsc.performance.clicks?.toLocaleString() || "0", icon: "👆" },
                      { label: "Impressions", value: results.gsc.performance.impressions?.toLocaleString() || "0", icon: "👁" },
                      { label: "Avg CTR", value: `${results.gsc.performance.ctr || 0}%`, icon: "📈" },
                      { label: "Avg Position", value: results.gsc.performance.position || "—", icon: "📍" },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        padding: "14px 16px", borderRadius: 10,
                        background: theme.surface, border: `1px solid ${theme.cardBorder}`,
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div>
                        <div style={{
                          fontSize: 20, fontWeight: 800, fontFamily: theme.fontMono,
                          color: theme.text, letterSpacing: "-0.02em",
                        }}>{stat.value}</div>
                        <div style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono, marginTop: 2 }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top Queries Table */}
                {results.gsc.topQueries?.length > 0 && (
                  <div style={{ margin: "0 12px 12px" }}>
                    <div style={{
                      padding: "10px 16px", fontSize: 12, fontWeight: 700,
                      fontFamily: theme.fontDisplay, color: theme.text,
                      borderBottom: `1px solid ${theme.cardBorder}`,
                    }}>Top Search Queries</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Query", "Clicks", "Impressions", "CTR", "Position"].map(h => (
                              <th key={h} style={{
                                padding: "8px 12px", textAlign: h === "Query" ? "left" : "right",
                                color: theme.textMuted, fontFamily: theme.fontMono, fontWeight: 600, fontSize: 10,
                                textTransform: "uppercase", letterSpacing: "0.06em",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.gsc.topQueries.map((q, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${theme.cardBorder}22` }}>
                              <td style={{ padding: "8px 12px", color: theme.text, fontFamily: theme.fontBody, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {q.key}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: theme.accent, fontFamily: theme.fontMono, fontWeight: 600 }}>
                                {q.clicks.toLocaleString()}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: theme.textMuted, fontFamily: theme.fontMono }}>
                                {q.impressions.toLocaleString()}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: theme.info, fontFamily: theme.fontMono }}>
                                {q.ctr}%
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: theme.fontMono, color: q.position <= 10 ? theme.accent : q.position <= 20 ? theme.warning : theme.danger }}>
                                {q.position}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Pages Table */}
                {results.gsc.topPages?.length > 0 && (
                  <div style={{ margin: "0 12px 12px" }}>
                    <div style={{
                      padding: "10px 16px", fontSize: 12, fontWeight: 700,
                      fontFamily: theme.fontDisplay, color: theme.text,
                      borderBottom: `1px solid ${theme.cardBorder}`,
                    }}>Top Pages</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Page", "Clicks", "Impressions", "CTR", "Position"].map(h => (
                              <th key={h} style={{
                                padding: "8px 12px", textAlign: h === "Page" ? "left" : "right",
                                color: theme.textMuted, fontFamily: theme.fontMono, fontWeight: 600, fontSize: 10,
                                textTransform: "uppercase", letterSpacing: "0.06em",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.gsc.topPages.map((p, i) => {
                            let pagePath;
                            try { pagePath = new URL(p.key).pathname; } catch { pagePath = p.key; }
                            return (
                              <tr key={i} style={{ borderBottom: `1px solid ${theme.cardBorder}22` }}>
                                <td style={{ padding: "8px 12px", color: theme.text, fontFamily: theme.fontMono, fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                  title={p.key}>
                                  {pagePath}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: theme.accent, fontFamily: theme.fontMono, fontWeight: 600 }}>
                                  {p.clicks.toLocaleString()}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: theme.textMuted, fontFamily: theme.fontMono }}>
                                  {p.impressions.toLocaleString()}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: theme.info, fontFamily: theme.fontMono }}>
                                  {p.ctr}%
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: theme.fontMono, color: p.position <= 10 ? theme.accent : p.position <= 20 ? theme.warning : theme.danger }}>
                                  {p.position}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sitemap Coverage */}
                {results.gsc.sitemaps && results.gsc.sitemaps.count > 0 && (
                  <div style={{
                    margin: "0 12px 12px", padding: "14px 18px", borderRadius: 12,
                    background: theme.surface, border: `1px solid ${theme.cardBorder}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 4 }}>
                        Sitemap Coverage
                      </div>
                      <div style={{ fontSize: 11, color: theme.textMuted }}>
                        {results.gsc.sitemaps.count} sitemap(s) submitted
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: theme.fontMono, color: theme.text }}>
                          {results.gsc.sitemaps.submitted}
                        </div>
                        <div style={{ fontSize: 9, color: theme.textMuted, fontFamily: theme.fontMono }}>SUBMITTED</div>
                      </div>
                      <div style={{ color: theme.textDim, fontSize: 16 }}>→</div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: theme.fontMono, color: theme.accent }}>
                          {results.gsc.sitemaps.indexed}
                        </div>
                        <div style={{ fontSize: 9, color: theme.textMuted, fontFamily: theme.fontMono }}>INDEXED</div>
                      </div>
                      <div style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                        fontFamily: theme.fontMono,
                        background: results.gsc.sitemaps.coverage >= 70 ? theme.accentGlow : theme.warningGlow,
                        color: results.gsc.sitemaps.coverage >= 70 ? theme.accent : theme.warning,
                        border: `1px solid ${results.gsc.sitemaps.coverage >= 70 ? theme.accentDim : "rgba(255,178,36,0.2)"}`,
                      }}>
                        {results.gsc.sitemaps.coverage}%
                      </div>
                    </div>
                  </div>
                )}

                {/* GSC Checks */}
                <div style={{ padding: "0 12px 16px" }}>
                  <SeverityGroupedList
                    items={results.gsc.checks || []}
                    renderItem={(item, key, index, blurred) => (
                      <CheckRow key={key} item={item} index={index} blurred={blurred} />
                    )}
                  />
                </div>
              </div>
            )}
            {activeTab === "gsc" && !results?.gsc?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>📊</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>{gscStatus.connected ? "No Data for This Site" : "Google Search Console Not Connected"}</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  {gscStatus.connected
                    ? "Your GSC account is connected, but no matching property was found for the scanned URL. Make sure the site is verified in your Search Console."
                    : "Connect your Google Search Console account to see search performance data, top queries, indexing status, and sitemap coverage."}
                </div>
                {!gscStatus.connected && tierAtLeast(tier, "pro") && (
                  <button
                    onClick={handleGscConnect}
                    style={{
                      padding: "10px 24px", borderRadius: 9,
                      border: "1px solid rgba(66,133,244,0.3)",
                      background: "rgba(66,133,244,0.08)",
                      color: "#8ab4f8",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: theme.fontBody,
                    }}>
                    Connect with Google
                  </button>
                )}
                {!tierAtLeast(tier, "pro") && (
                  <UpgradeBanner requiredTier="pro" compact featureDesc="Google Search Console integration requires Pro" />
                )}
              </div>
            )}

            {/* ─── GA4 Analytics Tab (with data) ─── */}
            {activeTab === "ga4" && results?.ga4?.available && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Property info bar */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 18px", borderRadius: 12,
                  background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)",
                }}>
                  <span style={{ fontSize: 20 }}>📈</span>
                  <div>
                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14 }}>
                      {results.ga4.propertyName || results.ga4.property}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                      Google Analytics 4 · Last 28 days
                    </div>
                  </div>
                </div>

                {/* Traffic Overview Stats */}
                <div>
                  <SectionHeader icon="📊" title="Traffic Overview" subtitle="Key metrics for the last 28 days" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 14 }}>
                    {[
                      { label: "Sessions", value: results.ga4.overview.sessions.toLocaleString(), icon: "👥" },
                      { label: "Users", value: results.ga4.overview.users.toLocaleString(), icon: "👤" },
                      { label: "Pageviews", value: results.ga4.overview.pageviews.toLocaleString(), icon: "📄" },
                      { label: "Bounce Rate", value: `${results.ga4.overview.bounceRate}%`, icon: "↩️",
                        color: results.ga4.overview.bounceRate < 40 ? theme.accent : results.ga4.overview.bounceRate <= 60 ? theme.warning : theme.danger },
                      { label: "Avg Duration", value: `${Math.floor(results.ga4.overview.avgSessionDuration / 60)}m ${results.ga4.overview.avgSessionDuration % 60}s`, icon: "⏱️" },
                    ].map((stat) => (
                      <div key={stat.label} style={{
                        background: theme.card, borderRadius: 12, border: `1px solid ${theme.cardBorder}`,
                        padding: "16px 14px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{stat.icon}</div>
                        <div style={{
                          fontFamily: theme.fontMono, fontSize: 20, fontWeight: 700,
                          color: stat.color || theme.text,
                        }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, fontFamily: theme.fontBody }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traffic Sources */}
                {results.ga4.trafficSources?.length > 0 && (
                  <div>
                    <SectionHeader icon="🔀" title="Traffic Sources" subtitle="Channel breakdown for the last 28 days" />
                    <div style={{
                      background: theme.card, borderRadius: 14, border: `1px solid ${theme.cardBorder}`,
                      overflow: "hidden", marginTop: 14,
                    }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Channel", "Sessions", "Users", "% of Total"].map((h) => (
                              <th key={h} style={{
                                padding: "10px 14px", textAlign: h === "Channel" ? "left" : "right",
                                fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase",
                                letterSpacing: "0.05em", fontFamily: theme.fontMono,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const totalSessions = results.ga4.trafficSources.reduce((s, r) => s + r.sessions, 0);
                            const channelColors = {
                              "Organic Search": theme.accent, "Direct": "#5B8DEF", "Paid Search": theme.violet,
                              "Social": "#FF6B9D", "Referral": "#FFB224", "Email": "#00D4AA",
                              "Display": "#FF8C42", "Organic Social": "#FF6B9D",
                            };
                            return results.ga4.trafficSources.map((src, i) => {
                              const pct = totalSessions > 0 ? Math.round((src.sessions / totalSessions) * 100) : 0;
                              const color = channelColors[src.channel] || theme.textMuted;
                              return (
                                <tr key={i} style={{ borderBottom: i < results.ga4.trafficSources.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}>
                                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: theme.fontBody }}>
                                    <span style={{
                                      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                                      background: color, marginRight: 8, verticalAlign: "middle",
                                    }} />
                                    {src.channel}
                                  </td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono, color: theme.text }}>
                                    {src.sessions.toLocaleString()}
                                  </td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono, color: theme.textMuted }}>
                                    {src.users.toLocaleString()}
                                  </td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono }}>
                                    <span style={{
                                      padding: "2px 8px", borderRadius: 5, fontSize: 10,
                                      background: `${color}15`, color: color, fontWeight: 600,
                                    }}>{pct}%</span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Pages */}
                {results.ga4.topPages?.length > 0 && (
                  <div>
                    <SectionHeader icon="📄" title="Top Pages" subtitle="Most visited pages in the last 28 days" />
                    <div style={{
                      background: theme.card, borderRadius: 14, border: `1px solid ${theme.cardBorder}`,
                      overflow: "hidden", marginTop: 14,
                    }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Page", "Views", "Sessions", "Bounce", "Avg Duration"].map((h) => (
                              <th key={h} style={{
                                padding: "10px 14px", textAlign: h === "Page" ? "left" : "right",
                                fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase",
                                letterSpacing: "0.05em", fontFamily: theme.fontMono,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.ga4.topPages.map((page, i) => (
                            <tr key={i} style={{ borderBottom: i < results.ga4.topPages.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}>
                              <td style={{
                                padding: "10px 14px", fontSize: 12, fontFamily: theme.fontMono,
                                maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                color: theme.text,
                              }} title={page.path}>{page.path}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono, color: theme.text }}>
                                {page.pageviews.toLocaleString()}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono, color: theme.textMuted }}>
                                {page.sessions.toLocaleString()}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono,
                                color: page.bounceRate < 40 ? theme.accent : page.bounceRate <= 60 ? theme.warning : theme.danger,
                              }}>{page.bounceRate}%</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontFamily: theme.fontMono, color: theme.textMuted }}>
                                {Math.floor(page.avgDuration / 60)}m {page.avgDuration % 60}s
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* GA4 Checks */}
                {results.ga4.checks?.length > 0 && (
                  <div>
                    <SectionHeader icon="✅" title="Analytics Checks" subtitle="Automated insights from your GA4 data" />
                    <SeverityGroupedList
                      items={results.ga4.checks}
                      renderItem={(item, key, index, blurred) => (
                        <CheckRow key={key} item={item} index={index} blurred={blurred} />
                      )}
                    />
                  </div>
                )}
              </div>
            )}
            {/* GA4 not connected empty state */}
            {activeTab === "ga4" && !results?.ga4?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>📈</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>{ga4Status.connected ? "No Analytics Data Available" : "Google Analytics 4 Not Connected"}</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  {ga4Status.connected
                    ? "Your GA4 account is connected, but no property is selected or the selected property has no data. Check your property selection in the Integrations tab."
                    : "Connect your Google Analytics 4 account to see traffic overview, top pages, traffic sources, and engagement insights."}
                </div>
                {!ga4Status.connected && tierAtLeast(tier, "premium") && (
                  <button
                    onClick={handleGa4Connect}
                    style={{
                      padding: "10px 24px", borderRadius: 9,
                      border: "1px solid rgba(66,133,244,0.3)",
                      background: "rgba(66,133,244,0.08)",
                      color: "#8ab4f8",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: theme.fontBody,
                    }}>
                    Connect with Google
                  </button>
                )}
                {!tierAtLeast(tier, "premium") && (
                  <UpgradeBanner requiredTier="premium" compact featureDesc="Google Analytics 4 integration requires Premium" />
                )}
              </div>
            )}

            {/* ─── Google Ads Tab ─── */}
            {activeTab === "ads" && results?.ads?.available && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Header */}
                <div style={{
                  background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                  padding: "20px 24px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>📢</span>
                    <div style={{ fontFamily: theme.fontDisplay, fontSize: 17, fontWeight: 700 }}>Google Ads</div>
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>
                    Data source: <span style={{ fontFamily: theme.fontMono, color: theme.text }}>
                      Google Analytics 4 (linked Ads account)
                    </span>
                  </div>
                  {results.ads.overview && (
                    <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                      {[
                        { label: "Impressions", value: results.ads.overview.impressions.toLocaleString() },
                        { label: "Clicks", value: results.ads.overview.clicks.toLocaleString() },
                        { label: "CTR", value: `${results.ads.overview.ctr}%` },
                        { label: "Avg CPC", value: `$${results.ads.overview.avgCpc.toFixed(2)}` },
                        { label: "Total Cost", value: `$${results.ads.overview.cost.toFixed(2)}` },
                        { label: "Conversions", value: results.ads.overview.conversions.toFixed(1) },
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: theme.fontMono, color: theme.text }}>{m.value}</div>
                          <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campaign Overview */}
                {results.ads.campaigns?.length > 0 && (
                  <div style={{ background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`, padding: "20px 24px" }}>
                    <div style={{ fontFamily: theme.fontDisplay, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Campaign Overview</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Campaign", "Impressions", "Clicks", "CTR", "Avg CPC", "Sessions", "Conversions", "Cost"].map(h => (
                              <th key={h} style={{
                                padding: "8px 10px", textAlign: h === "Campaign" ? "left" : "right",
                                fontFamily: theme.fontMono, fontSize: 10, fontWeight: 600,
                                color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.ads.campaigns.map((campaign, i) => (
                            <tr key={i} style={{ borderBottom: i < results.ads.campaigns.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}>
                              <td style={{ padding: "10px", fontWeight: 500 }}>{campaign.name}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{campaign.impressions.toLocaleString()}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{campaign.clicks.toLocaleString()}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono, color: campaign.ctr > 3 ? theme.accent : campaign.ctr >= 1 ? theme.warning : theme.danger }}>{campaign.ctr}%</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>${campaign.cpc.toFixed(2)}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{campaign.sessions.toLocaleString()}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{campaign.conversions.toFixed(1)}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>${campaign.cost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Keywords */}
                {results.ads.topKeywords?.length > 0 && (
                  <div style={{ background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`, padding: "20px 24px" }}>
                    <div style={{ fontFamily: theme.fontDisplay, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Top Keywords</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Keyword", "Ad Group", "Impressions", "Clicks", "CTR", "Sessions", "Bounce Rate"].map(h => (
                              <th key={h} style={{
                                padding: "8px 10px", textAlign: h === "Keyword" || h === "Ad Group" ? "left" : "right",
                                fontFamily: theme.fontMono, fontSize: 10, fontWeight: 600,
                                color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.ads.topKeywords.map((kw, i) => (
                              <tr key={i} style={{ borderBottom: i < results.ads.topKeywords.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}>
                                <td style={{ padding: "10px", fontWeight: 500 }}>{kw.keyword}</td>
                                <td style={{ padding: "10px", fontSize: 11, color: theme.textMuted }}>{kw.adGroup}</td>
                                <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{kw.impressions.toLocaleString()}</td>
                                <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{kw.clicks.toLocaleString()}</td>
                                <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono, color: kw.ctr > 3 ? theme.accent : kw.ctr >= 1 ? theme.warning : theme.danger }}>{kw.ctr}%</td>
                                <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{kw.sessions.toLocaleString()}</td>
                                <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono, color: kw.bounceRate < 40 ? theme.accent : kw.bounceRate <= 60 ? theme.warning : theme.danger }}>{kw.bounceRate}%</td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Landing Pages */}
                {results.ads.landingPages?.length > 0 && (
                  <div style={{ background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`, padding: "20px 24px" }}>
                    <div style={{ fontFamily: theme.fontDisplay, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Paid Landing Pages</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {["Page", "Sessions", "Impressions", "Clicks", "Conversions", "Bounce Rate", "Cost"].map(h => (
                              <th key={h} style={{
                                padding: "8px 10px", textAlign: h === "Page" ? "left" : "right",
                                fontFamily: theme.fontMono, fontSize: 10, fontWeight: 600,
                                color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.ads.landingPages.map((lp, i) => (
                            <tr key={i} style={{ borderBottom: i < results.ads.landingPages.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}>
                              <td style={{ padding: "10px", fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lp.page}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{lp.sessions.toLocaleString()}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{lp.impressions.toLocaleString()}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{lp.clicks.toLocaleString()}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>{lp.conversions.toFixed(1)}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono, color: lp.bounceRate < 40 ? theme.accent : lp.bounceRate <= 60 ? theme.warning : theme.danger }}>{lp.bounceRate}%</td>
                              <td style={{ padding: "10px", textAlign: "right", fontFamily: theme.fontMono }}>${lp.cost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Ads Checks */}
                {results.ads.checks?.length > 0 && (
                  <div style={{ background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`, padding: "20px 24px" }}>
                    <SeverityGroupedList
                      items={results.ads.checks}
                      title="Google Ads Checks"
                    />
                  </div>
                )}
              </div>
            )}
            {activeTab === "ads" && !results?.ads?.available && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>📢</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>Google Ads Data Not Available</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  {ga4Status.connected
                    ? "Your GA4 account is connected, but no Google Ads data was found. Link your Google Ads account to GA4 in Google Analytics admin settings."
                    : "Google Ads data is pulled through GA4. Connect your GA4 account first, then link Google Ads in GA4 admin settings."}
                </div>
                {!ga4Status.connected && tierAtLeast(tier, "premium") && (
                  <button
                    onClick={handleGa4Connect}
                    style={{
                      padding: "10px 24px", borderRadius: 9,
                      border: "1px solid rgba(66,133,244,0.3)",
                      background: "rgba(66,133,244,0.08)",
                      color: "#8ab4f8",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: theme.fontBody,
                    }}>
                    Connect GA4 First
                  </button>
                )}
                {!tierAtLeast(tier, "premium") && (
                  <UpgradeBanner requiredTier="premium" compact featureDesc="Google Ads integration requires Premium" />
                )}
              </div>
            )}

            {/* ─── Trends Tab ─── */}
            {activeTab === "trends" && tierAtLeast(tier, "premium") && (
              <Suspense fallback={null}>
              <TrendsPanel scanHistory={scanHistory} currentUrl={results?.url || url} token={session?.access_token} />
              </Suspense>
            )}
            {activeTab === "trends" && !tierAtLeast(tier, "premium") && (
              <div style={{
                background: theme.card, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>📈</div>
                <div style={{
                  fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 700,
                  marginBottom: 8,
                }}>Score Trends & History</div>
                <div style={{ color: theme.textMuted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
                  Track how your scores evolve over time with historical trend charts, regression alerts, and actionable insights.
                </div>
                <UpgradeBanner requiredTier="premium" compact featureDesc="Historical trends & score tracking requires Premium" />
              </div>
            )}

            {/* ─── Performance Tab ─── */}
            {activeTab === "speed" && (
              <div style={{
                background: theme.card, borderRadius: 16,
                border: `1px solid ${theme.cardBorder}`,
                padding: 24, position: "relative", overflow: "hidden",
              }}>
                {/* Decorative corner accent */}
                <div style={{
                  position: "absolute", top: -1, right: -1,
                  width: 120, height: 120,
                  background: `radial-gradient(circle at 100% 0%, rgba(167,119,255,0.06) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                <SectionHeader icon="⚡" title="Performance & Core Web Vitals"
                  subtitle={results?.performance?.error
                    ? "Could not fetch performance data — see details below"
                    : tier === "free" ? "Core metrics from Google PageSpeed Insights — upgrade for full audit" : "Full Lighthouse audit with Core Web Vitals"} />

                {results?.performance?.error && (
                  <div style={{
                    padding: "14px 18px", borderRadius: 12, marginBottom: 18,
                    background: theme.dangerGlow,
                    border: `1px solid rgba(255,77,106,0.2)`,
                    color: theme.danger, fontSize: 13,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>!</span>
                    <span>Performance analysis unavailable: {results.performance.error}</span>
                  </div>
                )}

                {/* Overall Performance Score */}
                {perfScore > 0 && (
                  <div className="sap-perf-score" style={{
                    display: "flex", alignItems: "center", gap: 22, marginBottom: 24,
                    padding: "20px 24px", borderRadius: 14,
                    background: "rgba(167,119,255,0.04)",
                    border: "1px solid rgba(167,119,255,0.12)",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Subtle pulse glow */}
                    <div style={{
                      position: "absolute", left: 30, top: "50%", transform: "translateY(-50%)",
                      width: 120, height: 120, borderRadius: "50%",
                      background: `radial-gradient(circle, ${perfScore >= 75 ? "rgba(0,245,212,0.08)" : perfScore >= 45 ? "rgba(255,178,36,0.08)" : "rgba(255,77,106,0.08)"}, transparent 60%)`,
                      animation: "breathe 3s ease-in-out infinite",
                      pointerEvents: "none",
                    }} />
                    <ScoreRing score={perfScore} size={80} strokeWidth={5} glowing />
                    <div style={{ position: "relative" }}>
                      <div style={{
                        fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: theme.fontDisplay,
                      }}>
                        Lighthouse Performance Score
                      </div>
                      <div style={{
                        fontSize: 12, color: theme.textMuted, marginTop: 4,
                        fontFamily: theme.fontMono,
                      }}>
                        Mobile · Google PageSpeed Insights
                      </div>
                      <div style={{
                        marginTop: 8, fontSize: 11, fontFamily: theme.fontMono,
                        fontWeight: 600, letterSpacing: "0.04em",
                        color: perfScore >= 90 ? theme.accent : perfScore >= 50 ? theme.warning : theme.danger,
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "3px 10px", borderRadius: 6,
                        background: perfScore >= 90 ? theme.accentGlow : perfScore >= 50 ? theme.warningGlow : theme.dangerGlow,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                        {perfScore >= 90 ? "EXCELLENT" : perfScore >= 50 ? "NEEDS IMPROVEMENT" : "POOR"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metric Cards */}
                <div className="sap-perf-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {(results?.performance?.metrics ?? []).map((m, i) => (
                    <PerformanceMetricCard key={i} m={m} available={tierAtLeast(tier, m.minTier || "free")} />
                  ))}
                </div>

                {/* No metrics fallback */}
                {(results?.performance?.metrics ?? []).length === 0 && !results?.performance?.error && (
                  <div style={{
                    textAlign: "center", padding: 40, color: theme.textMuted, fontSize: 13,
                    background: theme.surface, borderRadius: 14, border: `1px solid ${theme.cardBorder}`,
                  }}>
                    No performance metrics available for this URL.
                  </div>
                )}

                {/* Optimization Opportunities */}
                {tierAtLeast(tier, "pro") && (results?.performance?.opportunities ?? []).length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 14,
                      fontFamily: theme.fontDisplay, letterSpacing: "-0.01em",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 6,
                        background: theme.violetGlow,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: theme.violet,
                      }}>↑</span>
                      Top Optimization Opportunities
                    </div>
                    {results.performance.opportunities.map((opp, i) => (
                      <div key={i} className="sap-opportunity" style={{
                        padding: "14px 18px", borderRadius: 12, marginBottom: 8,
                        background: theme.surface,
                        border: `1px solid ${theme.cardBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
                        transition: "all 0.2s",
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{opp.title}</div>
                          {opp.savingsMs > 0 && (
                            <div style={{
                              fontSize: 11, color: theme.accent, marginTop: 4,
                              fontFamily: theme.fontMono, fontWeight: 500,
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                              <span style={{ fontSize: 9 }}>↓</span>
                              Save ~{opp.savingsMs >= 1000 ? `${(opp.savingsMs / 1000).toFixed(1)}s` : `${opp.savingsMs}ms`}
                            </div>
                          )}
                        </div>
                        <ScoreRing score={opp.score} size={36} strokeWidth={3} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Tier gating */}
                {tier === "free" && (
                  <div style={{ marginTop: 16 }}>
                    <UpgradeBanner requiredTier="pro" compact featureDesc="CLS, FCP & optimization opportunities available with Pro" />
                  </div>
                )}
                {tier === "pro" && (results?.performance?.metrics ?? []).some(m => m.minTier === "premium") && (
                  <div style={{ marginTop: 16 }}>
                    <UpgradeBanner requiredTier="premium" compact featureDesc="Speed Index & TTI metrics available with Premium" />
                  </div>
                )}
              </div>
            )}

            {/* ─── Export bar ─── */}
            <div className="sap-export-bar" style={{
              marginTop: 24, padding: "16px 22px",
              background: theme.surface,
              borderRadius: 14,
              border: `1px solid ${theme.cardBorder}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ color: theme.textMuted, fontSize: 12, fontWeight: 400 }}>
                {tier === "free" ? "Upgrade to Pro for PDF export"
                  : tier === "pro" ? "Export your report as PDF"
                  : "Export as webmaster PDF"}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "PDF", icon: "◧", minTier: "pro" },
                ].map(btn => {
                  const enabled = tierAtLeast(tier, btn.minTier);
                  const isPremium = btn.minTier === "premium";
                  return (
                    <button key={btn.label} disabled={!enabled}
                      onClick={() => {
                        if (!enabled) return;
                        if (btn.label === "PDF") import("./utils/generatePDF").then(m => m.default(results, tier, url, siteResults, summaryState.summary));
                      }}
                      style={{
                      padding: "8px 18px", borderRadius: 8,
                      border: `1px solid ${enabled ? (isPremium ? theme.premiumBorder : theme.cardBorderHover) : theme.cardBorder}`,
                      background: enabled && isPremium ? theme.premiumGlow : "transparent",
                      color: enabled ? (isPremium ? theme.premium : theme.text) : theme.textDim,
                      fontSize: 12, fontWeight: 600, cursor: enabled ? "pointer" : "not-allowed",
                      fontFamily: theme.fontMono, letterSpacing: "0.02em",
                      transition: "all 0.2s",
                    }}>
                      {btn.icon} {btn.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="sap-footer" style={{
        padding: "24px 32px", borderTop: `1px solid ${theme.cardBorder}`,
        textAlign: "center", color: theme.textDim, fontSize: 11, marginTop: 64,
        fontFamily: theme.fontMono, letterSpacing: "0.02em",
        display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <span>Trivium · open source · &copy; {new Date().getFullYear()}</span>
        <span>·</span>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{
          color: theme.textDim, fontFamily: theme.fontMono, fontSize: 11,
          textDecoration: "underline", textUnderlineOffset: 2,
        }}>Privacy Policy</a>
        <span>·</span>
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{
          color: theme.textDim, fontFamily: theme.fontMono, fontSize: 11,
          textDecoration: "underline", textUnderlineOffset: 2,
        }}>Terms of Service</a>
      </footer>
    </div>
  );
}
