// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getGscAuthUrl,
  handleGscCallback,
  getGscStatus,
  setGscProperty,
  disconnectGsc,
  verifyState,
} = require("../plugins/gsc");
const {
  getGa4AuthUrl,
  handleGa4Callback,
  getGa4Status,
  setGa4Property,
  disconnectGa4,
  verifyState: verifyGa4State,
} = require("../plugins/ga4");
const {
  getAdobeAuthUrl,
  handleAdobeCallback,
  getAdobeAnalyticsStatus,
  setAdobeAnalyticsReportSuite,
  disconnectAdobeAnalytics,
  verifyState: verifyAdobeState,
} = require("../plugins/adobe-analytics");
const {
  getMetaAuthUrl,
  handleMetaCallback,
  getMetaStatus,
  setMetaPage,
  disconnectMeta,
  verifyState: verifyMetaState,
} = require("../plugins/meta");

function createIntegrationsRouter({ oauthLimiter }) {
  const router = express.Router();
  const callbackLimiter = oauthLimiter || ((_req, _res, next) => next());

  router.get("/gsc/auth", callbackLimiter, requireAuth, (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({ error: "Google OAuth not configured" });
    }
    return res.redirect(getGscAuthUrl(req.user.id));
  });

  router.get("/gsc/callback", callbackLimiter, async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Missing code or state parameter");
    }

    const userId = verifyState(state);
    if (!userId) {
      return res.status(403).send("Invalid or expired OAuth state");
    }

    try {
      const result = await handleGscCallback(code, userId);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?gsc=connected&property=${encodeURIComponent(result.selected || "")}`);
    } catch (err) {
      console.error("[GSC] OAuth callback error:", err.message);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?gsc=error`);
    }
  });

  router.get("/gsc/status", requireAuth, async (req, res) => {
    try {
      const status = await getGscStatus(req.user.id);
      return res.json(status);
    } catch (err) {
      console.error("[GSC] Status check failed:", err.message);
      return res.json({ connected: false, property: null, properties: [] });
    }
  });

  router.put("/gsc/property", requireAuth, express.json(), async (req, res) => {
    const { property } = req.body;
    if (!property || typeof property !== "string") {
      return res.status(400).json({ error: "property is required" });
    }
    try {
      await setGscProperty(req.user.id, property);
      return res.json({ success: true, property });
    } catch (err) {
      if (err.message.includes("do not have access")) {
        return res.status(403).json({ error: err.message });
      }
      return res.status(500).json({ error: "Failed to update property" });
    }
  });

  router.delete("/gsc", requireAuth, async (req, res) => {
    try {
      await disconnectGsc(req.user.id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  router.get("/ga4/auth", callbackLimiter, requireAuth, (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({ error: "Google OAuth not configured" });
    }
    return res.redirect(getGa4AuthUrl(req.user.id));
  });

  router.get("/ga4/callback", callbackLimiter, async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Missing code or state parameter");
    }

    const userId = verifyGa4State(state);
    if (!userId) {
      return res.status(403).send("Invalid or expired OAuth state");
    }

    try {
      const result = await handleGa4Callback(code, userId);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?ga4=connected&property=${encodeURIComponent(result.selected || "")}`);
    } catch (err) {
      console.error("[GA4] OAuth callback error:", err.message);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?ga4=error`);
    }
  });

  router.get("/ga4/status", requireAuth, async (req, res) => {
    try {
      const status = await getGa4Status(req.user.id);
      return res.json(status);
    } catch (err) {
      console.error("[GA4] Status check failed:", err.message);
      return res.json({ connected: false, property: null, properties: [] });
    }
  });

  router.put("/ga4/property", requireAuth, express.json(), async (req, res) => {
    const { property } = req.body;
    if (!property || typeof property !== "string") {
      return res.status(400).json({ error: "property is required" });
    }
    try {
      await setGa4Property(req.user.id, property);
      return res.json({ success: true, property });
    } catch (err) {
      if (err.message.includes("do not have access")) {
        return res.status(403).json({ error: err.message });
      }
      return res.status(500).json({ error: "Failed to update property" });
    }
  });

  router.delete("/ga4", requireAuth, async (req, res) => {
    try {
      await disconnectGa4(req.user.id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  router.get("/adobe-analytics/auth", callbackLimiter, requireAuth, (req, res) => {
    if (!process.env.ADOBE_CLIENT_ID) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?adobe_analytics=error`);
    }
    return res.redirect(getAdobeAuthUrl(req.user.id));
  });

  router.get("/adobe-analytics/callback", callbackLimiter, async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Missing code or state parameter");
    }

    const userId = verifyAdobeState(state);
    if (!userId) {
      return res.status(403).send("Invalid or expired OAuth state");
    }

    try {
      const result = await handleAdobeCallback(code, userId);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?adobe_analytics=connected&property=${encodeURIComponent(result.selected || "")}`);
    } catch (err) {
      console.error("[Adobe Analytics] OAuth callback error:", err.message);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?adobe_analytics=error`);
    }
  });

  router.get("/adobe-analytics/status", requireAuth, async (req, res) => {
    try {
      const status = await getAdobeAnalyticsStatus(req.user.id);
      return res.json(status);
    } catch (err) {
      console.error("[Adobe Analytics] Status check failed:", err.message);
      return res.json({ connected: false, property: null, properties: [] });
    }
  });

  router.put("/adobe-analytics/property", requireAuth, express.json(), async (req, res) => {
    const { property } = req.body;
    if (!property || typeof property !== "string") {
      return res.status(400).json({ error: "property is required" });
    }
    try {
      await setAdobeAnalyticsReportSuite(req.user.id, property);
      return res.json({ success: true, property });
    } catch (err) {
      if (err.message.includes("do not have access")) {
        return res.status(403).json({ error: err.message });
      }
      return res.status(500).json({ error: "Failed to update report suite" });
    }
  });

  router.delete("/adobe-analytics", requireAuth, async (req, res) => {
    try {
      await disconnectAdobeAnalytics(req.user.id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  router.get("/meta/auth", callbackLimiter, requireAuth, (req, res) => {
    if (!process.env.META_APP_ID) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?meta_business=error`);
    }
    return res.redirect(getMetaAuthUrl(req.user.id));
  });

  router.get("/meta/callback", callbackLimiter, async (req, res) => {
    if (req.query.error) {
      console.error("[Meta] OAuth denied:", req.query.error, req.query.error_description);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?meta_business=error`);
    }

    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Missing code or state parameter");
    }

    const userId = verifyMetaState(state);
    if (!userId) {
      return res.status(403).send("Invalid or expired OAuth state");
    }

    try {
      const result = await handleMetaCallback(code, userId);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?meta_business=connected&property=${encodeURIComponent(result.selected || "")}`);
    } catch (err) {
      console.error("[Meta] OAuth callback error:", err.message);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}?meta_business=error`);
    }
  });

  router.get("/meta/status", requireAuth, async (req, res) => {
    try {
      const status = await getMetaStatus(req.user.id);
      return res.json(status);
    } catch (err) {
      console.error("[Meta] Status check failed:", err.message);
      return res.json({ connected: false, page: null, pages: [] });
    }
  });

  router.put("/meta/property", requireAuth, express.json(), async (req, res) => {
    const { property } = req.body;
    if (!property || typeof property !== "string") {
      return res.status(400).json({ error: "property is required" });
    }
    try {
      await setMetaPage(req.user.id, property);
      return res.json({ success: true, property });
    } catch (err) {
      if (err.message.includes("do not have access")) {
        return res.status(403).json({ error: err.message });
      }
      return res.status(500).json({ error: "Failed to update Facebook Page" });
    }
  });

  router.delete("/meta", requireAuth, async (req, res) => {
    try {
      await disconnectMeta(req.user.id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  return router;
}

module.exports = { createIntegrationsRouter };
